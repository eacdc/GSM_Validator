# GSM Validator for Books

A specialized web application that validates GSM (Grams per Square Meter) specifications for books. Using OpenAI's GPT model with function calling, it gathers book specifications and validates whether the measured weight matches the expected weight based on GSM calculations.

## Features

- **Modern Chat Interface**: Beautiful, responsive design with smooth animations
- **OpenAI Integration**: Uses GPT-3.5-turbo with function calling capabilities
- **GSM Validation**: Validates book specifications against measured weights
- **Natural Language Processing**: Users can provide book specifications in conversational format
- **Comprehensive Analysis**: Calculates expected weight and provides validation status
- **Real-time Communication**: Instant responses with loading indicators

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **AI**: OpenAI GPT-3.5-turbo with function calling
- **Styling**: Modern CSS with gradients and animations

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- OpenAI API key

### Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Edit the `.env` file
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_actual_openai_api_key_here
     PORT=3000
     ```

4. **Start the server**:
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

5. **Open your browser** and navigate to `http://localhost:3000`

## How to Use

1. **Open the application** in your web browser
2. **Click "Let's Start"** to begin the conversation
3. **Provide your book specifications** when prompted:
   - Length of the book (in centimeters)
   - Breadth/width of the book (in centimeters)
   - Number of text pages in the book
   - GSM of the text pages (grams per square meter)
   - GSM of the cover (grams per square meter)
   - Measured weight of the book (in grams)

The chatbot will gather all parameters, calculate the expected weight based on GSM specifications, and provide a validation result comparing expected vs. measured weight.

## API Endpoints

- `POST /api/chat` - Send a message to the chatbot
- `POST /api/reset` - Reset the conversation history

## Validation Results

- **PASSED**: Weight variance within ±5% (acceptable range)
- **WARNING**: Weight variance between 5-10% (moderate concern)
- **FAILED**: Weight variance exceeds 10% (significant discrepancy)
- **Detailed Analysis**: Page area, expected weights, variance percentage

## Project Structure

```
├── server.js              # Express server with OpenAI integration
├── package.json           # Node.js dependencies and scripts
├── .env                   # Environment variables (add your API key here)
├── public/
│   ├── index.html        # Main HTML file
│   ├── style.css         # CSS styles
│   └── script.js         # Frontend JavaScript
└── README.md            # Project documentation
```

## Customization

### Adding New Calculation Functions

To add new calculation types, modify the `performCalculation` function in `server.js` and update the function schema in the `functions` array.

### Styling

The application uses modern CSS with gradients and animations. You can customize the appearance by modifying `public/style.css`.

### AI Behavior

Adjust the system prompt in `server.js` to change how the AI responds to users.

## Troubleshooting

- **API Key Issues**: Make sure your OpenAI API key is valid and properly set in the `.env` file
- **Port Conflicts**: If port 3000 is in use, change the PORT variable in `.env`
- **Network Issues**: Ensure you have a stable internet connection for OpenAI API calls

## License

This project is open source and available under the MIT License. 