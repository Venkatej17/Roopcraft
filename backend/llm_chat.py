"""
Drop-in replacement for `emergentintegrations.llm.chat`.

Emergent's original package routes calls through their metered proxy
(EMERGENT_LLM_KEY, billed in Emergent credits). This module calls each
provider's public API directly, using your own API key, so the app can
run fully outside Emergent's platform for free (Gemini has a generous
free tier: https://aistudio.google.com/apikey).

Usage is unchanged from the original package:

    chat = LlmChat(api_key=..., session_id=..., system_message=...).with_model("gemini", "gemini-2.5-flash")
    text = await chat.send_message(UserMessage(text="..."))

`api_key` is accepted for signature compatibility but ignored — each
provider's key is read from its own environment variable instead
(GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY), selected based on
whichever provider is passed to `.with_model(...)`.
"""

import os
import requests


class UserMessage:
    def __init__(self, text: str):
        self.text = text


class LlmChat:
    def __init__(self, api_key: str = None, session_id: str = None, system_message: str = ""):
        # api_key kept only for compatibility with the old call signature;
        # real keys are looked up per-provider from the environment below.
        self.session_id = session_id
        self.system_message = system_message
        self.provider = None
        self.model = None

    def with_model(self, provider: str, model: str) -> "LlmChat":
        self.provider = provider
        self.model = model
        return self

    async def send_message(self, message: UserMessage) -> str:
        if self.provider == "gemini":
            return self._call_gemini(message.text)
        elif self.provider == "openai":
            return self._call_openai(message.text)
        elif self.provider == "anthropic":
            return self._call_anthropic(message.text)
        raise ValueError(f"Unsupported provider: {self.provider}")

    def _call_gemini(self, user_text: str) -> str:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey "
                "and add it to your backend .env file."
            )
        model = self.model or "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        }
        if self.system_message:
            payload["systemInstruction"] = {"parts": [{"text": self.system_message}]}
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

    def _call_openai(self, user_text: str) -> str:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set. Add it to your backend .env file.")
        model = self.model or "gpt-4o-mini"
        messages = []
        if self.system_message:
            messages.append({"role": "system", "content": self.system_message})
        messages.append({"role": "user", "content": user_text})
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": model, "messages": messages},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    def _call_anthropic(self, user_text: str) -> str:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set. Add it to your backend .env file.")
        model = self.model or "claude-sonnet-4-5"
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": model,
                "max_tokens": 2048,
                "system": self.system_message or None,
                "messages": [{"role": "user", "content": user_text}],
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]
