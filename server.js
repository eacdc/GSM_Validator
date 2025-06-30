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

// GSM validation function for books
function validateBookGSM(length, breadth, textPages, textGSM, coverGSM, measuredWeight) {
  try {
    // Convert dimensions from cm to meters for calculation
    const lengthM = length / 100;
    const breadthM = breadth / 100;
    const pageArea = lengthM * breadthM; // Area of one page in square meters
    
    // Calculate expected weights
    const textWeight = (textPages * pageArea * textGSM) / 1000; // Convert grams to kg, then back to grams
    const coverWeight = (2 * pageArea * coverGSM) / 1000; // Front and back cover
    const expectedTotalWeight = (textWeight + coverWeight) * 1000; // Convert to grams
    
    // Calculate variance
    const weightDifference = Math.abs(measuredWeight - expectedTotalWeight);
    const percentageVariance = (weightDifference / expectedTotalWeight) * 100;
    
    // Determine validation status
    let validationStatus;
    let statusMessage;
    
    if (percentageVariance <= 5) {
      validationStatus = "PASSED";
      statusMessage = "GSM validation passed - weight is within acceptable range (±5%)";
    } else if (percentageVariance <= 10) {
      validationStatus = "WARNING";
      statusMessage = "GSM validation warning - weight variance is moderate (5-10%)";
    } else {
      validationStatus = "FAILED";
      statusMessage = "GSM validation failed - weight variance exceeds acceptable limits (>10%)";
    }
    
    return {
      validationStatus,
      statusMessage,
      calculations: {
        pageArea: Math.round(pageArea * 10000) / 10000, // Round to 4 decimal places
        expectedTextWeight: Math.round(textWeight * 1000 * 100) / 100,
        expectedCoverWeight: Math.round(coverWeight * 1000 * 100) / 100,
        expectedTotalWeight: Math.round(expectedTotalWeight * 100) / 100,
        measuredWeight: measuredWeight,
        weightDifference: Math.round(weightDifference * 100) / 100,
        percentageVariance: Math.round(percentageVariance * 100) / 100
      }
    };
  } catch (error) {
    return {
      validationStatus: "ERROR",
      statusMessage: "Error in GSM calculation: " + error.message,
      calculations: null
    };
  }
}

// Function definitions for OpenAI function calling
const functions = [
  {
    name: "validate_book_gsm",
    description: "Validates the GSM (Grams per Square Meter) of a book by comparing expected weight with measured weight",
    parameters: {
      type: "object",
      properties: {
        length: {
          type: "number",
          description: "Length of the book in centimeters"
        },
        breadth: {
          type: "number",
          description: "Breadth/width of the book in centimeters"
        },
        textPages: {
          type: "number",
          description: "Number of text pages in the book"
        },
        textGSM: {
          type: "number",
          description: "GSM (grams per square meter) of the text pages"
        },
        coverGSM: {
          type: "number",
          description: "GSM (grams per square meter) of the cover pages"
        },
        measuredWeight: {
          type: "number",
          description: "Actual measured weight of the book in grams"
        }
      },
      required: ["length", "breadth", "textPages", "textGSM", "coverGSM", "measuredWeight"]
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
      content: `You are a specialized GSM (Grams per Square Meter) validation assistant for books. Your job is to help validate the GSM specifications of books by gathering the required parameters and performing weight validation calculations.

      To validate a book's GSM, you need to collect these parameters from the user:
      1. Length of the book (in centimeters)
      2. Breadth/width of the book (in centimeters)  
      3. Number of text pages in the book
      4. GSM of the text pages (grams per square meter)
      5. GSM of the cover (grams per square meter)
      6. Measured weight of the book (in grams)

      Once you have all parameters, call the validate_book_gsm function to perform the validation.

      Be friendly and professional. Ask for the parameters one by one if needed, and explain what GSM means if the user seems unfamiliar with it. GSM stands for "Grams per Square Meter" and is a measure of paper density/weight.

      If this is the first interaction, greet the user warmly and explain what you can help them with.`
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
      
      if (functionName === 'validate_book_gsm') {
        functionResult = validateBookGSM(
          functionArgs.length,
          functionArgs.breadth,
          functionArgs.textPages,
          functionArgs.textGSM,
          functionArgs.coverGSM,
          functionArgs.measuredWeight
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
        content: JSON.stringify(functionResult)
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