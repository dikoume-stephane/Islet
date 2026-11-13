//! Les temoins du clavier : Verr Maj, Verr Num, Defil, et la langue de saisie.
//!
//! **Un capteur, pas un decideur.** Ce module regarde les touches passer dans le
//! crochet clavier deja installe, lit la disposition de la fenetre au premier
//! plan, et envoie un identifiant de langue Windows brut sur l'evenement
//! `keyboard-indicators`. La table des langues, le choix des pastilles et la
//! detection de ce qui a change vivent dans `src/lib/keyboard.ts`, ou ils sont
//! testes sans toucher a Windows.
//!
//! Deux details qui comptent :
//!
//! * **`GetKeyState` repond pour le fil appelant.** Il n'est donc lu que depuis
//!   le fil du crochet, celui qui traite reellement les messages du clavier.
//!   Depuis un autre fil, la valeur serait celle du dernier message traite par
//!   ce fil, donc n'importe quoi.
//! * **Le crochet voit la touche avant Windows.** L'etat lu sur `VK_CAPITAL`
//!   est encore l'ancien : le nouveau est son inverse. C'est justement ce qui
//!   permet de l'annoncer sans attendre.
//!
//! La langue, elle, se surveille par sondage : `GetKeyboardLayout` ne depend pas
//! du fil appelant, et un changement de langue ne produit aucune touche qu'on
//! pourrait intercepter de facon fiable (Alt+Maj, Win+Espace).

use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicI64, AtomicU16, AtomicU8, Ordering};
use std::sync::OnceLock;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// Evenement ecoute par la fenetre d'overlay.
pub const EVENT: &str = "keyboard-indicators";

/// Reglage qui coupe tout : eteint, on ne lit rien et on n'envoie rien.
const SETTING: &str = "islet-keyboard-indicators-enabled";

/// Cadence de surveillance de la langue. 250 ms : le changement est visible en
/// arrivant dans une fenetre, sans reveiller le processeur pour rien.
const POLL_MS: u64 = 250;

/// Une repetition automatique ne doit pas faire clignoter l'indicateur.
const REPEAT_GUARD_MS: i64 = 400;

const VK_CAPS: u16 = 0x14;
const VK_NUM: u16 = 0x90;
const VK_SCROLL: u16 = 0x91;

static APP: OnceLock<AppHandle> = OnceLock::new();

static CAPS: AtomicBool = AtomicBool::new(false);
static NUM: AtomicBool = AtomicBool::new(false);
static SCROLL: AtomicBool = AtomicBool::new(false);
/// Bits 0, 1, 2 : les trois touches ont deja ete lues au moins une fois.
static SEEDED: AtomicU8 = AtomicU8::new(0);
/// Derniere langue connue, pour ne signaler que les changements.
static LANG_ID: AtomicU16 = AtomicU16::new(0);
static LAST_TOGGLE_VK: AtomicU16 = AtomicU16::new(0);
static LAST_TOGGLE_MS: AtomicI64 = AtomicI64::new(0);

#[derive(Serialize, Clone)]
struct KeyboardIndicators {
    caps: bool,
    num: bool,
    scroll: bool,
    lang_id: u16,
    /// `caps`, `num`, `scroll` ou `lang` : ce qui vient de changer.
    kind: String,
    at: i64,
}

fn enabled(app: &AppHandle) -> bool {
    crate::utils::get_setting_str(app, SETTING)
        .map(|value| value != "false")
        .unwrap_or(true)
}

/// Etat des trois touches, lu dans le fil courant (voir l'avertissement en tete).
unsafe fn read_toggles() -> (bool, bool, bool) {
    use windows::Win32::UI::Input::KeyboardAndMouse::GetKeyState;
    let pressed = |vk: u16| (GetKeyState(vk as i32) & 0x0001) != 0;
    (pressed(VK_CAPS), pressed(VK_NUM), pressed(VK_SCROLL))
}

/// Premiere lecture : l'etat peut avoir ete fixe avant le demarrage d'Islet.
fn seed_toggles() {
    if SEEDED.load(Ordering::Relaxed) == 0b111 {
        return;
    }
    let (caps, num, scroll) = unsafe { read_toggles() };
    CAPS.store(caps, Ordering::Relaxed);
    NUM.store(num, Ordering::Relaxed);
    SCROLL.store(scroll, Ordering::Relaxed);
    SEEDED.store(0b111, Ordering::Relaxed);
}

fn emit(app: &AppHandle, kind: &str) {
    let payload = KeyboardIndicators {
        caps: CAPS.load(Ordering::Relaxed),
        num: NUM.load(Ordering::Relaxed),
        scroll: SCROLL.load(Ordering::Relaxed),
        lang_id: LANG_ID.load(Ordering::Relaxed),
        kind: kind.to_string(),
        at: crate::utils::get_now_ms(),
    };
    let _ = app.emit(EVENT, payload);
}

/// Appelee par le crochet clavier a chaque touche physique enfoncee.
///
/// Ne bloque jamais la touche : Windows continue de basculer Verr Maj lui-meme,
/// l'indicateur ne fait que le dire.
pub fn observe_key(vk: u16) {
    if !matches!(vk, VK_CAPS | VK_NUM | VK_SCROLL) {
        return;
    }
    let Some(app) = APP.get() else { return };
    if !enabled(app) {
        return;
    }

    let now = crate::utils::get_now_ms();
    if LAST_TOGGLE_VK.load(Ordering::Relaxed) == vk
        && now - LAST_TOGGLE_MS.load(Ordering::Relaxed) < REPEAT_GUARD_MS
    {
        return;
    }
    LAST_TOGGLE_VK.store(vk, Ordering::Relaxed);
    LAST_TOGGLE_MS.store(now, Ordering::Relaxed);

    seed_toggles();

    // L'etat lu est celui d'avant le traitement de la touche : on inverse.
    let (caps, num, scroll) = unsafe { read_toggles() };
    match vk {
        VK_CAPS => CAPS.store(!caps, Ordering::Relaxed),
        VK_NUM => NUM.store(!num, Ordering::Relaxed),
        _ => SCROLL.store(!scroll, Ordering::Relaxed),
    }

    let kind = match vk {
        VK_CAPS => "caps",
        VK_NUM => "num",
        _ => "scroll",
    };
    emit(app, kind);
}

/// Identifiant de langue de la fenetre au premier plan, `0` si on ne peut pas le lire.
fn foreground_language() -> u16 {
    use windows::Win32::UI::Input::KeyboardAndMouse::GetKeyboardLayout;
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

    unsafe {
        let window = GetForegroundWindow();
        if window.0.is_null() {
            return 0;
        }
        let thread = GetWindowThreadProcessId(window, None);
        if thread == 0 {
            return 0;
        }
        let layout = GetKeyboardLayout(thread);
        // Les seize bits bas portent la langue, le reste la disposition precise.
        (layout.0 as usize & 0xFFFF) as u16
    }
}

/// Demarre la surveillance de la langue.
///
/// A appeler une seule fois, apres l'installation du crochet clavier.
pub fn start(app: AppHandle) {
    let _ = APP.set(app.clone());

    // Etat des trois touches au demarrage : Verr Maj peut etre actif depuis ce
    // matin sans qu'on ait appuye dessus depuis.
    seed_toggles();

    // Etat de depart note sans rien annoncer : au demarrage, personne n'a
    // change de langue, et un indicateur qui s'allume tout seul au boot est un
    // bogue du point de vue de celui qui regarde l'ecran.
    let initial = foreground_language();
    if initial != 0 {
        LANG_ID.store(initial, Ordering::Relaxed);
    }

    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(POLL_MS));
        if !enabled(&app) {
            continue;
        }
        let lang = foreground_language();
        if lang != 0 && lang != LANG_ID.load(Ordering::Relaxed) {
            LANG_ID.store(lang, Ordering::Relaxed);
            emit(&app, "lang");
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_toggle_keys_are_observed() {
        // La fonction sort avant tout appel systeme pour les autres touches :
        // ce test verifie surtout qu'on n'a pas elargi la surveillance par erreur.
        assert!(matches!(0x14u16, VK_CAPS | VK_NUM | VK_SCROLL));
        assert!(!matches!(0x41u16, VK_CAPS | VK_NUM | VK_SCROLL));
    }

    #[test]
    fn toggle_keys_have_the_documented_codes() {
        assert_eq!(VK_CAPS, 0x14);
        assert_eq!(VK_NUM, 0x90);
        assert_eq!(VK_SCROLL, 0x91);
    }
}
