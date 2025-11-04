This is the most important step\! Running the project requires **two** separate servers to run at the same time:

1.  **The Backend (Python Server):** This is your `api.py` file, which runs the AI models and connects to the Gemini API.
2.  **The Frontend (Live Server):** This serves your `index.html`, `style.css`, and `.js` files. You are already doing this with VS Code's "Live Server" on port `5500`, which is perfect.

Here are the complete instructions from start to finish.

-----

### Step 1: Update `api.py` to Use the API Key

First, I've updated your `api.py` file one last time. This new version will **read the API key from your command prompt** instead of having it typed in the code. This is the correct, secure way to do it.

http://googleusercontent.com/immersive_entry_chip/0

-----

### Step 2: Full Command Line Instructions

Here are the step-by-step commands to run your project on your local machine.

#### **Terminal 1: Run the Backend (FastAPI Server)**

Open a new Command Prompt (CMD).

1.  **Navigate to your `server` directory.**
    ```cmd
    cd D:\WD\Hack\server

    ```
2.  **(One-Time Setup) Install all Python dependencies.**
    ```cmd
    pip install -r requirements.txt

    ```
3.  **Set your Google API Key.** (You must do this *every time* you open a new CMD window).
    ```cmd
    $env:GOOGLE_API_KEY="AIzaSyDdNxvqPafbQIgEo20B4boLIRvJOuyjTwI"

    ```
4.  **Run the API server.**
    ```cmd
    uvicorn api:app --reload
        
    You should see text confirming the server is running, like `INFO: Uvicorn running on http://127.0.0.1:8000` and `INFO: Application startup complete.`. **Keep this terminal open.**

    ```

#### **Terminal 2: Run the Frontend (Live Server)**

You can use the VS Code Live Server, as you've been doing.

1.  Open your main project folder (`D:\WD\Hack`) in Visual Studio Code.
2.  In the VS Code file explorer, right-click on `index.html`.
3.  Select **"Open with Live Server"**.

This will open your browser to `http://127.0.0.1:5500/Hack/index.html`.

Your entire application is now running. The website at port `5500` will make `fetch` requests to your API at port `8000`. You can now log in, go to the service pages, and test the forms.