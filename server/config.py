# config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # This tells pydantic to look for a .env file
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')
    
    # Define the environment variables you need
    EMAIL: str

# Create a single, reusable instance of the settings
settings = Settings()