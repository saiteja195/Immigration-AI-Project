from openai import Client
import os
from dotenv import load_dotenv
import textwrap

# Load environment variables
load_dotenv()

# Initialize the OpenAI Client with your RunPod API Key and Endpoint URL
client = Client(
    api_key="rpa_35V2FN4F5CH902OUBLJAJYITS6P3HNOR1GY7HVUY970uqo",
    base_url="https://api.runpod.ai/v2/ht6s0givb0ruh4/openai/v1"
)

def get_chat_response(user_input: str) -> str:
    """
    Get a chat response from the LLM using the RunPod endpoint.
    
    Args:
        user_input (str): The user's input message
        
    Returns:
        str: The LLM's response
    """
    response = client.chat.completions.create(
        model="google/gemma-3-1b-it",  # or any other model you have access to
        messages=[
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": user_input}
        ]
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    # Example usage
    # user_message = "What is the capital of France?"
    # response = get_chat_response(user_message)
    # print(f"User: {user_message}")
    # print(f"Assistant: {response}") 
    while True:
        # Prompt the user for input
        user_message = input("You: ")
        if user_message.lower() in ["exit", "quit"]:
            print("Exiting the chat.")
            break
        response = get_chat_response(user_message)
        # Format the response
        wrapped_response = textwrap.fill(response, width=70)
        print(f"Assistant: {wrapped_response}") 