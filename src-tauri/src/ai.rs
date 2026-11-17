//! L'envoi d'une question à un modèle, et rien de plus.
//!
//! **Ce module ne décide de rien.** L'adresse, le modèle, les consignes et le
//! texte envoyé sont construits dans `src/lib/ai.ts`, où ils se vérifient sans
//! machine Windows. Ici : une requête POST, un plafond de temps, et la réponse
//! brute avec son code.
//!
//! Deux garde-fous, et ils sont minces exprès :
//!
//! - le schéma de l'adresse doit être `http` ou `https` ; un `file:` ou un
//!   `javascript:` n'a rien à faire dans une requête sortante ;
//! - le corps est borné en taille, pour qu'un panneau ne transforme pas une
//!   mauvaise manip en envoi de plusieurs mégaoctets.
//!
//! Ce que ce module ne fait pas, et ne fera pas : choisir un fournisseur,
//! retenir une clé, ou envoyer quelque chose sans qu'on le lui demande.

use serde::Serialize;
use std::time::Duration;

/// Un modèle local peut être lent à charger ; un modèle distant, non.
const TIMEOUT_SECS: u64 = 60;

/// Au-delà, la requête est refusée avant de partir.
const MAX_BODY_BYTES: usize = 60_000;

/// Ce que le panneau reçoit : le code, la réponse, et si c'est passé.
#[derive(Serialize, Debug)]
pub struct AiRaw {
    pub ok: bool,
    pub status: u16,
    pub body: String,
}

/// Les refus, séparés du réseau pour pouvoir les vérifier.
fn check_request(url: &str, body: &str) -> Result<(), String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("bad-url".to_string());
    }
    if body.len() > MAX_BODY_BYTES {
        return Err("body-too-large".to_string());
    }
    Ok(())
}

/// Envoie le corps à l'adresse, et rend ce que le fournisseur a répondu.
///
/// Un code d'erreur HTTP n'est **pas** une panne : c'est une réponse, et le
/// panneau saura la lire (`ok: false`). Seul l'échec de transport remonte en
/// `Err`, avec `timeout` quand le délai est dépassé.
#[tauri::command]
pub async fn ai_post(url: String, body: String) -> Result<AiRaw, String> {
    check_request(&url, &body)?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(TIMEOUT_SECS))
        .user_agent("Islet (https://github.com/dikoume-stephane/Islet)")
        .build()
        .map_err(|error| format!("client: {error}"))?;

    let response = client
        .post(&url)
        .header("content-type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|error| {
            if error.is_timeout() {
                "timeout".to_string()
            } else {
                format!("request: {error}")
            }
        })?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|error| format!("body: {error}"))?;

    Ok(AiRaw {
        ok: (200..300).contains(&status),
        status,
        body,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_a_scheme_that_is_not_http() {
        assert_eq!(
            check_request("file:///etc/passwd", "{}").unwrap_err(),
            "bad-url"
        );
        assert_eq!(
            check_request("javascript:alert(1)", "{}").unwrap_err(),
            "bad-url"
        );
        assert!(check_request("http://127.0.0.1:11434/v1/chat/completions", "{}").is_ok());
        assert!(check_request("https://exemple.fr/v1/chat/completions", "{}").is_ok());
    }

    #[test]
    fn refuses_a_body_that_is_too_large() {
        let big = "x".repeat(MAX_BODY_BYTES + 1);
        assert_eq!(
            check_request("http://127.0.0.1:11434/v1/chat/completions", &big).unwrap_err(),
            "body-too-large"
        );
    }
}
