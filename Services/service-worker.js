// This single script handles all forms across your service pages.
document.addEventListener("DOMContentLoaded", () => {
    
    // Set the base URL of your running FastAPI server
    const API_URL = "http://127.0.0.1:8000";

    /**
     * Helper function to display the result or an error message.
     * @param {HTMLElement} resultElement - The <div> to show/hide.
     * @param {HTMLElement} textElement - The <p> tag to put the message in.
     * @param {string} message - The message to display.
     * @param {boolean} isError - Toggles error styling.
     */
    function showResult(resultElement, textElement, message, isError = false) {
        if (!resultElement || !textElement) return;

        // Sanitize newlines from Gemini responses for proper HTML rendering
        const formattedMessage = message.replace(/\\n/g, '<br>');
        textElement.innerHTML = formattedMessage; // Use innerHTML to render line breaks
        resultElement.style.display = "block";

        if (isError) {
            resultElement.style.backgroundColor = "#fff0f0";
            resultElement.style.borderColor = "#ffbaba";
            textElement.style.color = "#d8000c";
        } else {
            resultElement.style.backgroundColor = "#e6f7ff";
            resultElement.style.borderColor = "#b3e0ff";
            textElement.style.color = "#333";
        }
    }

    /**
     * Generic handler for forms that submit JSON data.
     * @param {Event} event - The form submission event.
     * @param {string} endpoint - The API endpoint to call (e.g., "/predict_crop").
     * @param {HTMLElement} resultEl - The result <div>.
     * @param {HTMLElement} textEl - The result <p> tag.
     * @param {string} successKey - The key to look for in the JSON response (e.g., "crop", "prediction").
     */
    async function handleJsonSubmit(event, endpoint, resultEl, textEl, successKey) {
        event.preventDefault();
        const form = event.target;
        const button = form.querySelector('button[type="submit"]');
        const originalButtonText = button.innerText;

        button.innerText = "Analyzing...";
        button.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // --- THIS IS THE FIX ---
        // We only convert fields that are *supposed* to be numbers.
        // This stops the code from converting string fields like 'location' or 'timeframe' to numbers.
        const numericFields = [
            'nitrogen', 'phosphorus', 'potassium', 'temperature', 'humidity',
            'ph', 'rainfall', 'moisture', 'phosphorous', 'area', 'last_rain', 'temp'
        ];

        for (const key of numericFields) {
            // Check if the key exists in our form data and is a valid number
            if (data[key] !== undefined && !isNaN(data[key]) && data[key] !== "") {
                data[key] = parseFloat(data[key]);
            }
        }
        // --- END OF FIX ---

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                // Use result[successKey] for local models, or result.prediction for Gemini
                const message = result[successKey] || result.prediction || "No result found.";
                showResult(resultEl, textEl, message, false);
            } else {
                const errorMessage = result.error || (result.detail ? result.detail[0].msg : 'Unknown error');
                showResult(resultEl, textEl, `Error: ${errorMessage}`, true);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            showResult(resultEl, textEl, `Network Error: Could not connect to the API. Is it running?`, true);
        } finally {
            button.innerText = originalButtonText;
            button.disabled = false;
        }
    }

    /**
     * Special handler for the disease detection form (file upload).
     * @param {Event} event - The form submission event.
     * @param {string} endpoint - The API endpoint to call.
     * @param {HTMLElement} resultEl - The result <div>.
     * @param {HTMLElement} textEl - The result <p> tag.
     * @param {string} successKey - The key to look for in the JSON response.
     */
    async function handleFileSubmit(event, endpoint, resultEl, textEl, successKey) {
        event.preventDefault();
        const form = event.target;
        const button = form.querySelector('button[type="submit"]');
        const originalButtonText = button.innerText;
        
        // This input name 'file' must match the correction in disease-detection.html
        const fileInput = form.querySelector('input[name="file"]'); 
        
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            showResult(resultEl, textEl, "Please select an image file first.", true);
            return;
        }

        button.innerText = "Uploading & Analyzing...";
        button.disabled = true;

        const formData = new FormData();
        // The API endpoint expects the file under the key 'file'
        formData.append('file', fileInput.files[0]);

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                body: formData, // No 'Content-Type' header; browser sets it for FormData
            });

            const result = await response.json();

            if (response.ok) {
                const message = result[successKey] || "Analysis complete.";
                showResult(resultEl, textEl, message, false);
            } else {
                showResult(resultEl, textEl, `Error: ${result.error}`, true);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            showResult(resultEl, textEl, `Network Error: Could not connect to the API. Is it running?`, true);
        } finally {
            button.innerText = originalButtonText;
            button.disabled = false;
        }
    }

    /**
     * --- NEW FUNCTION ---
     * Special handler for the Weather Planning form.
     * Fetches weather from Open-Meteo first, then sends to our API.
     */
    async function handleWeatherPlanSubmit(event, endpoint, resultEl, textEl, successKey) {
        event.preventDefault();
        const form = event.target;
        const button = form.querySelector('button[type="submit"]');
        const originalButtonText = button.innerText;
        const location = form.location.value;

        button.innerText = "Fetching Weather...";
        button.disabled = true;

        let forecastString = "";

        try {
            // 1. Get Latitude and Longitude from location name
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
            const geoResponse = await fetch(geoUrl);
            const geoData = await geoResponse.json();

            if (!geoData.results || geoData.results.length === 0) {
                showResult(resultEl, textEl, "Error: Could not find that location. Please be more specific (e.g., 'Bhopal, India').", true);
                button.innerText = originalButtonText;
                button.disabled = false;
                return;
            }

            const { latitude, longitude, name } = geoData.results[0];
            button.innerText = `Getting forecast for ${name}...`;

            // 2. Get 7-Day Weather Forecast
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
            const weatherResponse = await fetch(weatherUrl);
            const weatherData = await weatherResponse.json();

            if (!weatherData.daily) {
                throw new Error("Invalid weather data received.");
            }

            // 3. Format weather data as a string for Gemini
            forecastString = "7-Day Forecast:\n";
            for (let i = 0; i < 7; i++) {
                forecastString += 
                    `Day ${i+1} (${weatherData.daily.time[i]}): ` +
                    `Max: ${weatherData.daily.temperature_2m_max[i]}°C, ` +
                    `Min: ${weatherData.daily.temperature_2m_min[i]}°C, ` +
                    `Precipitation: ${weatherData.daily.precipitation_sum[i]}mm\n`;
            }

            // 4. Send to our API (which sends to Gemini)
            button.innerText = "Generating Plan...";
            const payload = {
                location: name,
                forecast_data: forecastString
            };

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                const message = result[successKey] || "Plan generated.";
                showResult(resultEl, textEl, message, false);
            } else {
                showResult(resultEl, textEl, `Error: ${result.error}`, true);
            }

        } catch (error) {
            console.error("Weather Fetch Error:", error);
            showResult(resultEl, textEl, `Network Error: Could not get weather data. ${error.message}`, true);
        } finally {
            button.innerText = originalButtonText;
            button.disabled = false;
        }
    }


    // --- Attach event listeners based on which form is on the page ---

    // 1. Crop Recommendation (crop-recommendation.html)
    const cropForm = document.getElementById("recommendation-form");
    if (cropForm) {
        const resultEl = document.getElementById("recommendation-result");
        const textEl = resultEl.querySelector("#result-text");
        cropForm.addEventListener("submit", (e) => 
            handleJsonSubmit(e, "/predict_crop", resultEl, textEl, "crop")
        );
    }

    // 2. Disease Detection (disease-detection.html)
    const diseaseForm = document.getElementById("disease-form");
    if (diseaseForm) {
        const resultEl = document.getElementById("disease-result");
        const textEl = resultEl.querySelector("#result-text");
        diseaseForm.addEventListener("submit", (e) => 
            handleFileSubmit(e, "/predict_disease", resultEl, textEl, "disease")
        );
    }

    // 3. Fertilizer Recommendation (fertilizer-recommendation.html)
    const fertilizerForm = document.getElementById("fertilizer-form");
    if (fertilizerForm) {
        const resultEl = document.getElementById("fertilizer-result");
        const textEl = resultEl.querySelector("#result-text");
        fertilizerForm.addEventListener("submit", (e) => 
            handleJsonSubmit(e, "/predict_fertilizer", resultEl, textEl, "fertilizer")
        );
    }

    // 4. Yield Prediction (yield-prediction.html)
    const yieldForm = document.getElementById("yield-form");
    if (yieldForm) {
        const resultEl = document.getElementById("yield-result");
        const textEl = resultEl.querySelector("#result-text");
        yieldForm.addEventListener("submit", (e) => 
            handleJsonSubmit(e, "/predict_yield", resultEl, textEl, "prediction")
        );
    }

    // 5. Weather Planning (weather-planning.html)
    // --- THIS IS THE CHANGE ---
    const weatherForm = document.getElementById("weather-form");
    if (weatherForm) {
        const resultEl = document.getElementById("weather-result");
        const textEl = resultEl.querySelector("#result-text");
        // We now call our new custom function instead of the generic one
        weatherForm.addEventListener("submit", (e) => 
            handleWeatherPlanSubmit(e, "/predict_weather_plan", resultEl, textEl, "prediction")
        );
    }
    
    // 6. Market Prediction (market-prediction.html)
    const marketForm = document.getElementById("market-form");
    if (marketForm) {
        const resultEl = document.getElementById("market-result");
        const textEl = resultEl.querySelector("#result-text");
        marketForm.addEventListener("submit", (e) => 
            handleJsonSubmit(e, "/predict_market", resultEl, textEl, "prediction")
        );
    }

    // 7. Irrigation Management (irrigation-management.html)
    const irrigationForm = document.getElementById("irrigation-form");
    if (irrigationForm) {
        const resultEl = document.getElementById("irrigation-result");
        const textEl = resultEl.querySelector("#result-text");
        irrigationForm.addEventListener("submit", (e) => 
            handleJsonSubmit(e, "/predict_irrigation", resultEl, textEl, "prediction")
        );
    }

    // 8. Expert Consultation (expert-consultation.html)
    const expertForm = document.getElementById("expert-form");
    if (expertForm) {
        const resultEl = document.getElementById("expert-result");
        expertForm.addEventListener("submit", (e) => {
            e.preventDefault();
            // This form doesn't call an API, it just shows the static message
            const textEl = resultEl.querySelector("p"); // Get the <p> tag inside
            showResult(resultEl, textEl, "An expert will review your question and reply to your email, typically within 48 hours.", false);
            expertForm.reset();
        });
    }

});
