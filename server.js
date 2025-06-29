const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Sample calculation function
function performCalculation(operation, num1, num2) {
  switch (operation.toLowerCase()) {
    case 'add':
      return num1 + num2;
    case 'subtract':
      return num1 - num2;
    case 'multiply':
      return num1 * num2;
    case 'divide':
      return num2 !== 0 ? num1 / num2 : 'Cannot divide by zero';
    case 'power':
      return Math.pow(num1, num2);
    default:
      return 'Unknown operation';
  }
}

// Function definitions for OpenAI function calling
const functions = [
  {
    name: "perform_calculation",
    description: "Performs mathematical calculations between two numbers",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          description: "The mathematical operation to perform",
          enum: ["add", "subtract", "multiply", "divide", "power"]
        },
        num1: {
          type: "number",
          description: "The first number"
        },
        num2: {
          type: "number",
          description: "The second number"
        }
      },
      required: ["operation", "num1", "num2"]
    }
  }
];

// Store conversation history
let conversationHistory = [];

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Add user message to conversation history
    conversationHistory.push({ role: 'user', content: message });
    
    // Initial system prompt
    const systemPrompt = {
      role: 'system',
      content: `You are a helpful assistant that can perform mathematical calculations. 
      When a user asks for a calculation, gather the required parameters (operation type, first number, second number) 
      and then call the perform_calculation function. Always be friendly and explain what you're doing.
      
      Available operations: add, subtract, multiply, divide, power
      
      If this is the first interaction, greet the user warmly and ask what calculation they'd like to perform.`
    };
    
    // Prepare messages for OpenAI
    const messages = [systemPrompt, ...conversationHistory];
    
    // Call OpenAI with function calling
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      functions: functions,
      function_call: "auto",
    });
    
    const responseMessage = completion.choices[0].message;
    
    // Check if OpenAI wants to call a function
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);
      
      let functionResult;
      
      if (functionName === 'perform_calculation') {
        functionResult = performCalculation(
          functionArgs.operation,
          functionArgs.num1,
          functionArgs.num2
        );
      }
      
      // Add function call and result to conversation
      conversationHistory.push({
        role: 'assistant',
        content: null,
        function_call: responseMessage.function_call
      });
      
      conversationHistory.push({
        role: 'function',
        name: functionName,
        content: functionResult.toString()
      });
      
      // Get final response from OpenAI with function result
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [systemPrompt, ...conversationHistory],
      });
      
      const finalResponse = finalCompletion.choices[0].message.content;
      conversationHistory.push({ role: 'assistant', content: finalResponse });
      
      res.json({ message: finalResponse });
    } else {
      // No function call needed, just return the response
      conversationHistory.push({ role: 'assistant', content: responseMessage.content });
      res.json({ message: responseMessage.content });
    }
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

// Reset conversation endpoint
app.post('/api/reset', (req, res) => {
  conversationHistory = [];
  res.json({ message: 'Conversation reset successfully' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 