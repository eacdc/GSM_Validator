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

// GSM validation function for books using specific formulas
function validateBookGSM(length, breadth, textPages, textGSM, coverGSM, measuredWeight) {
  try {
    // Variable mapping as per user requirements:
    // b2 = length in cm
    // d2 = breadth in cm
    // b3 = text pages
    // d3 = requested GSM (textGSM)
    // d4 = requested GSM for cover (coverGSM)
    // d5 = measured weight in gm
    
    const b2 = length;
    const d2 = breadth;
    const b3 = textPages;
    const d3 = textGSM;
    const d4 = coverGSM;
    const d5 = measuredWeight;
    
    // Calculate min estimated weight (a6)
    // Formula: 0.96*B2/100*D2/100*(B3/2*D3/1000+2*D4/1000)*1000
    const a6 = 0.96 * (b2/100) * (d2/100) * ((b3/2) * (d3/1000) + 2 * (d4/1000)) * 1000;
    
    // Calculate max estimated weight (a7)
    // Formula: 1.04*B2/100*D2/100*(B3/2*D3/1000+2*D4/1000)*1000
    const a7 = 1.04 * (b2/100) * (d2/100) * ((b3/2) * (d3/1000) + 2 * (d4/1000)) * 1000;
    
    // Calculate actual GSM used or confirm specified GSM
    // Formula: if(or(D5<A6,D5>A7),round((D5/1000-B2/100*D2/100*2*D4/1000)/B3*2/B2*100/D2*100*1000,0),"")
    let actualGSMUsed = "";
    let gsmStatus = "";
    
    if (d5 >= a6 && d5 <= a7) {
      // Weight is within range - specified GSM is correct
      actualGSMUsed = d3; // Use the specified text GSM
      gsmStatus = "CORRECT";
    } else {
      // Weight is outside range - calculate actual GSM used
      actualGSMUsed = Math.round((d5/1000 - (b2/100) * (d2/100) * 2 * (d4/1000)) / b3 * 2 / (b2/100) / (d2/100) * 1000);
      gsmStatus = "CALCULATED";
    }
    
    // Determine validation status based on weight range
    let validationStatus;
    let statusMessage;
    
    if (d5 >= a6 && d5 <= a7) {
      validationStatus = "PASSED";
      statusMessage = "GSM validation passed - measured weight is within estimated range. The specified GSM is correct.";
    } else if (d5 < a6) {
      validationStatus = "UNDERWEIGHT";
      statusMessage = "GSM validation failed - book is underweight compared to specifications";
    } else {
      validationStatus = "OVERWEIGHT";
      statusMessage = "GSM validation failed - book is overweight compared to specifications";
    }
    
    return {
      validationStatus,
      statusMessage,
      calculations: {
        minEstimatedWeight: Math.round(a6 * 100) / 100,
        maxEstimatedWeight: Math.round(a7 * 100) / 100,
        measuredWeight: d5,
        actualGSMUsed: actualGSMUsed,
        gsmStatus: gsmStatus,
        weightDifference: {
          fromMin: Math.round((d5 - a6) * 100) / 100,
          fromMax: Math.round((d5 - a7) * 100) / 100
        },
        inputParameters: {
          length: b2,
          breadth: d2,
          textPages: b3,
          requestedTextGSM: d3,
          requestedCoverGSM: d4
        }
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
    description: "Validates the GSM (Grams per Square Meter) of a book by comparing expected weight with measured weight. Also calculates the actual GSM used based on the measured weight when it falls outside the expected range.",
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

      IMPORTANT: When presenting the validation results, always mention the paper GSM information:
      - If the measured weight falls within the expected range (gsmStatus = "CORRECT"), clearly state that "The specified GSM of [X] g/m² is correct and matches the measured weight."
      - If the measured weight is outside the expected range (gsmStatus = "CALCULATED"), clearly state "Based on the measured weight, the actual GSM used was [X] g/m² instead of the specified GSM."

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