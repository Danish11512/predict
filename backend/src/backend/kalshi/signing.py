"""RSA-PSS-SHA256 signing for Kalshi REST and WebSocket (timestamp + METHOD + path, no query)."""

from __future__ import annotations

import base64
from functools import lru_cache
from urllib.parse import urlparse

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey


def path_for_request(rest_base_url: str, request_path: str) -> str:
    """Return the URL path used in the signature (includes /trade-api/v2 prefix)."""
    p = request_path if request_path.startswith("/") else f"/{request_path}"
    merged = rest_base_url.rstrip("/") + p
    return urlparse(merged).path


def websocket_sign_path(ws_url: str) -> str:
    """Path segment for WS handshake: ``GET`` + ``/trade-api/ws/v2``."""
    path = urlparse(ws_url).path
    if not path:
        return "/trade-api/ws/v2"
    return path


def sign_message(private_key: RSAPrivateKey, message: str) -> str:
    signature = private_key.sign(
        message.encode("utf-8"),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.DIGEST_LENGTH,
        ),
        hashes.SHA256(),
    )
    return base64.b64encode(signature).decode("utf-8")


def sign_request(
    private_key: RSAPrivateKey,
    timestamp_ms: str,
    method: str,
    path_without_query: str,
) -> str:
    """Sign ``timestamp + METHOD + path`` where path has no query string."""
    path_only = path_without_query.split("?", 1)[0]
    message = f"{timestamp_ms}{method.upper()}{path_only}"
    return sign_message(private_key, message)


@lru_cache
def load_private_key_from_pem(pem: str) -> RSAPrivateKey:
    key = serialization.load_pem_private_key(
        pem.encode("utf-8"),
        password=None,
    )
    if not isinstance(key, RSAPrivateKey):
        raise TypeError("Kalshi API private key must be RSA")
    return key
