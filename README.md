# AI Calculator Chatbot

A modern web application that combines a chat interface with OpenAI's GPT model to create an intelligent calculator chatbot. The bot can understand natural language requests for mathematical calculations and perform them using function calling.

## Features

- **Modern Chat Interface**: Beautiful, responsive design with smooth animations
- **OpenAI Integration**: Uses GPT-3.5-turbo with function calling capabilities
- **Mathematical Calculations**: Supports add, subtract, multiply, divide, and power operations
- **Natural Language Processing**: Users can ask for calculations in plain English
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
3. **Ask for calculations** in natural language, for example:
   - "Can you add 25 and 17?"
   - "What's 144 divided by 12?"
   - "Calculate 2 to the power of 8"
   - "Multiply 15 by 23"

The chatbot will understand your request, extract the necessary parameters, perform the calculation, and provide a friendly response with the result.

## API Endpoints

- `POST /api/chat` - Send a message to the chatbot
- `POST /api/reset` - Reset the conversation history

## Available Calculations

- **Addition**: Add two numbers
- **Subtraction**: Subtract one number from another
- **Multiplication**: Multiply two numbers
- **Division**: Divide one number by another
- **Power**: Raise a number to a power

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