import uvicorn
import pickle
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import io
import time
import google.generativeai as genai
import warnings
from sklearn.base import InconsistentVersionWarning
import os # <-- IMPORT OS

# Suppress the InconsistentVersionWarning from scikit-learn
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)

# --- 1. APP & MODEL LOADING ---

app = FastAPI()

# Enable CORS to allow your frontend to call the API
# ... (Middleware code is unchanged) ...
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# --- GEMINI API SETUP ---
try:
    # --- THIS IS THE FIX ---
    # Read the API key from your computer's environment variables
    API_KEY = os.environ.get("GOOGLE_API_KEY")
    if not API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable not set.")
    # --- END OF FIX ---

    genai.configure(api_key=API_KEY)
    
    # Use a valid, available model name
    gemini_model = genai.GenerativeModel('gemini-2.5-flash-preview-09-2025')
except Exception as e:
    print(f"Error configuring Gemini: {e}")
    gemini_model = None

# --- Local Model Loading ---
try:
    with open("Navis_Base.pkl", "rb") as f:
        crop_model = pickle.load(f)
    with open("fertikizer.pkl", "rb") as f:
        fertilizer_model = pickle.load(f)
    with open("label_encoder.pkl", "rb") as f:
        fertilizer_encoder = pickle.load(f)
except Exception as e:
    print(f"Error loading local models: {e}")
    crop_model, fertilizer_model, fertilizer_encoder = None, None, None
# ... (The rest of your api.py file is unchanged) ...
# --- 2. API INPUT SCHEMAS (PYDANTIC) ---

class CropInput(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float

class FertilizerInput(BaseModel):
    temperature: float
    humidity: float
    moisture: float
    nitrogen: float
    potassium: float
    phosphorous: float  # Note the spelling matches the JS and HTML
    soil_type: str
    crop_type: str

class CropYieldInput(BaseModel):
    location: str
    crop_type: str
    area: float
    soil_type: str

class MarketInput(BaseModel):
    crop_type: str
    market_location: str
    timeframe: str

class IrrigationInput(BaseModel):
    crop_type: str
    soil_type: str
    last_rain: int
    temp: float

class WeatherInput(BaseModel):
    location: str 
    forecast_data: str # New field to accept forecast from frontend

# --- 3. HELPER FUNCTION FOR GEMINI ---

async def call_gemini_api(system_prompt, user_prompt, retries=3, delay=2):
    """
    Calls the Gemini API with a system prompt and a user prompt.
    Includes exponential backoff for retries.
    """
    if not gemini_model:
        # FIX: Raise an HTTPException on failure
        raise HTTPException(status_code=500, detail="Gemini model is not initialized. Check API key and configuration.")
    
    for attempt in range(retries):
        try:
            full_prompt = f"{system_prompt}\n\nUSER QUERY:\n{user_prompt}"
            response = gemini_model.generate_content(full_prompt)
            
            # Check for safety ratings or blockages
            if not response.candidates:
                 # FIX: Raise an HTTPException
                 raise HTTPException(status_code=500, detail="Response was blocked by safety settings.")
            
            # Check if text is available before returning
            if response.candidates[0].content.parts:
                return {"prediction": response.candidates[0].content.parts[0].text}
            else:
                # FIX: Raise an HTTPException
                raise HTTPException(status_code=500, detail="No text content returned from API.")
        
        except Exception as e:
            if "503" in str(e) and attempt < retries - 1:  # 503 is a common throttling error
                time.sleep(delay * (2 ** attempt))  # Exponential backoff
            else:
                # FIX: Raise an HTTPException
                raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")
    # FIX: Raise an HTTPException
    raise HTTPException(status_code=500, detail="Gemini API request failed after multiple retries.")

# --- 4. API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "FarmConnect API is running!"}

@app.post("/predict_disease")
async def predict_disease(file: UploadFile = File(...)):
    """
    Uses Gemini to analyze an image of a plant leaf and identify diseases.
    """
    if not gemini_model:
        # FIX: Raise an HTTPException
        raise HTTPException(status_code=500, detail="Gemini model not loaded")
        
    try:
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Prepare the prompt for Gemini
        system_prompt = (
            "You are a plant pathologist. Analyze the image of the plant leaf. "
            "Identify the plant and the disease, if any. "
            "Respond *only* with the plant name and disease name, formatted like: "
            "'Plant: [Plant Name], Disease: [Disease Name]'. "
            "If the plant is healthy, respond with 'Disease: Healthy'."
        )
        
        response = None
        retries = 3
        delay = 2
        for attempt in range(retries):
            try:
                response = gemini_model.generate_content([system_prompt, image])
                
                if not response.candidates:
                    # FIX: Raise an HTTPException
                    raise HTTPException(status_code=500, detail="Response was blocked by safety settings")
                
                # If successful, break the loop
                break
            
            # --- THIS BLOCK WAS MISSING, CAUSING THE SYNTAX ERROR ---
            except Exception as e:
                if "503" in str(e) and attempt < retries - 1:  # 503 is a common throttling error
                    time.sleep(delay * (2 ** attempt))  # Exponential backoff
                else:
                    # FIX: Raise an HTTPException
                    raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")
            # --- END OF FIX ---
        
        if not response:
             # FIX: Raise an HTTPException
             raise HTTPException(status_code=500, detail="Gemini API request failed after multiple retries.")

        # Format the response to match the frontend's expectation
        if response.candidates[0].content.parts:
            return {"disease": response.candidates[0].content.parts[0].text}
        else:
            # FIX: Raise an HTTPException
            raise HTTPException(status_code=500, detail="No text content returned from API.")
    
    except Exception as e:
        # FIX: Raise an HTTPException
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/predict_crop")
def predict_crop(data: CropInput):
    """
    Predicts the best crop using the local Navis_Base.pkl model.
    """
    if not crop_model:
        # FIX: Raise an HTTPException
        raise HTTPException(status_code=500, detail="Crop model not loaded")
    
    try:
        features = [[
            data.nitrogen, 
            data.phosphorus, 
            data.potassium, 
            data.temperature, 
            data.humidity, 
            data.ph, 
            data.rainfall
        ]]
        
        prediction = crop_model.predict(features)
        return {"crop": prediction[0].capitalize()}
    except Exception as e:
        # FIX: Raise an HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_fertilizer")
def predict_fertilizer(data: FertilizerInput):
    """
    Predicts the best fertilizer using the local fertikizer.pkl model.
    """
    if not fertilizer_model or not fertilizer_encoder:
        # FIX: Raise an HTTPException
        raise HTTPException(status_code=500, detail="Fertilizer model not loaded")

    try:
        # Define all possible columns as per the model's training data
        columns = [
            'Temparature', 'Humidity ', 'Moisture', 'Nitrogen', 'Potassium', 'Phosphorous',
            'Soil Type_Black', 'Soil Type_Clayey', 'Soil Type_Loamy', 'Soil Type_Red', 'Soil Type_Sandy',
            'Crop Type_Barley', 'Crop Type_Cotton', 'Crop Type_Ground Nuts', 'Crop Type_Maize',
            'Crop Type_Millets', 'Crop Type_Oil seeds', 'Crop Type_Paddy', 'Crop Type_Pulses',
            'Crop Type_Sugarcane', 'Crop Type_Tobacco', 'Crop Type_Wheat'
        ]
        
        # Prepare input dictionary with all zeros
        input_dict = {col: [0] for col in columns}
        
        # Populate with data from the form
        input_dict['Temparature'] = [data.temperature]

        # NOTE: The trailing space in 'Humidity ' is INTENTIONAL.
        # It matches the column name in the trained 'fertikizer.pkl' model.
        input_dict['Humidity '] = [data.humidity]
        
        input_dict['Moisture'] = [data.moisture]
        input_dict['Nitrogen'] = [data.nitrogen]
        input_dict['Potassium'] = [data.potassium]
        input_dict['Phosphorous'] = [data.phosphorous]
        
        # Set the one-hot encoded columns
        soil_key = f'Soil Type_{data.soil_type}'
        if soil_key in input_dict:
            input_dict[soil_key] = [1]
            
        crop_key = f'Crop Type_{data.crop_type}'
        if crop_key in input_dict:
            input_dict[crop_key] = [1]

        # Create the DataFrame for prediction
        input_df = pd.DataFrame(input_dict)
        
        # Make prediction
        pred = fertilizer_model.predict(input_df)[0]
        fertilizer = fertilizer_encoder.inverse_transform([pred])[0]
        
        return {"fertilizer": fertilizer.upper()}
    except Exception as e:
        # FIX: Raise an HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_yield")
async def predict_yield_gemini(data: CropYieldInput):
    """
    Uses Gemini to predict crop yield.
    """
    system_prompt = (
        "You are an agricultural expert. A farmer needs a yield prediction. "
        "Based on the following data, provide a concise, one-sentence prediction. "
        "Start your response with 'Estimated Yield:'."
    )
    user_prompt = (
        f"Location: {data.location}\n"
        f"Crop: {data.crop_type}\n"
        f"Area: {data.area} hectares\n"
        f"Soil: {data.soil_type}"
    )
    return await call_gemini_api(system_prompt, user_prompt)

@app.post("/predict_market")
async def predict_market_gemini(data: MarketInput):
    """
    Uses Gemini to predict market prices.
    """
    system_prompt = (
        "You are an agricultural market analyst. A farmer needs a price forecast. "
        "Based on the following data, provide a concise, one-sentence prediction. "
        "Start your response with 'Market Forecast:'."
    )
    user_prompt = (
        f"Crop: {data.crop_type}\n"
        f"Market: {data.market_location}\n"
        f"Timeframe: {data.timeframe}"
    )
    return await call_gemini_api(system_prompt, user_prompt)

@app.post("/predict_irrigation")
async def predict_irrigation_gemini(data: IrrigationInput):
    """
    Uses Gemini to give irrigation advice.
    """
    system_prompt = (
        "You are an irrigation specialist. A farmer needs a watering recommendation. "
        "Based on the following data, provide a simple, actionable, one-sentence recommendation. "
        "Start your response with 'Irrigation Advice:'."
    )
    user_prompt = (
        f"Crop: {data.crop_type}\n"
        f"Soil: {data.soil_type}\n"
        f"Days since last rain/irrigation: {data.last_rain}\n"
        f"Current Temperature: {data.temp}°C"
    )
    return await call_gemini_api(system_prompt, user_prompt)

@app.post("/predict_weather_plan")
async def predict_weather_plan_gemini(data: WeatherInput):
    """
    Uses Gemini to create a 7-day weather plan based on user-provided forecast data.
    """
    system_prompt = (
        "You are a farm planning assistant. A farmer needs a 7-day operations plan. "
        "Based on their location and the provided weather forecast data, "
        "provide a concise, actionable, 7-day plan as a simple bulleted list. "
        "Advise on ideal times for planting, irrigation, or harvesting based on the forecast."
    )
    # Inject the new forecast_data into the prompt
    user_prompt = (
        f"Location: {data.location}\n"
        f"7-Day Weather Forecast Data:\n{data.forecast_data}"
    )
    
    # The helper function 'call_gemini_api' now handles all errors
    # so we can just call it directly.
    return await call_gemini_api(system_prompt, user_prompt)


# --- 5. RUN THE APP ---
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)

