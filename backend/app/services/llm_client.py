# backend/app/services/llm_client.py
import requests
import os

LLM_SERVER_URL = os.getenv("LLM_SERVER_URL", "http://llm:8080")


class LLMClient:
    def __init__(self, server_url: str = LLM_SERVER_URL):
        self.server_url = server_url

    def get_explanation(self, prompt: str) -> str:
        """
        Sends a prompt to the local LLM server and gets an explanation.
        """
        try:
            response = requests.post(
                f"{self.server_url}/completion",
                json={
                    "prompt": prompt,
                    "n_predict": 256,  # Max tokens to generate
                    "temperature": 0.2,
                    "stop": ["\nUser:", "\nSystem:"],  # Stop sequences
                },
                timeout=60,  # 60-second timeout
            )
            response.raise_for_status()
            # The actual content is in the 'content' key of the JSON response
            return response.json().get("content", "Error: No content in response.")
        except requests.exceptions.RequestException as e:
            print(f"Error calling LLM service: {e}")
            return "Error: Could not connect to the explanation service."


# Example usage (for testing)
if __name__ == "__main__":
    client = LLMClient()
    test_prompt = "User: Explain what a Python list is in one sentence."
    explanation = client.get_explanation(test_prompt)
    print(f"Prompt: {test_prompt}")
    print(f"Explanation: {explanation}")
