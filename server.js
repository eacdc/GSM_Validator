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
    const { message, language = 'en' } = req.body;
    
    // Add user message to conversation history
    conversationHistory.push({ role: 'user', content: message });
    
    // Create language-specific system prompt
    const getSystemPrompt = (lang) => {
      if (lang === 'fr') {
        return {
          role: 'system',
          content: `Vous êtes un assistant spécialisé dans la validation GSM (Grammes par Mètre Carré) pour les livres. Votre travail consiste à aider à valider les spécifications GSM des livres en collectant les paramètres requis et en effectuant des calculs de validation du poids.

          Pour valider le GSM d'un livre, vous devez collecter ces paramètres auprès de l'utilisateur :
          1. Longueur du livre (en centimètres)
          2. Largeur du livre (en centimètres)
          3. Nombre de pages de texte dans le livre
          4. GSM des pages de texte (grammes par mètre carré)
          5. GSM de la couverture (grammes par mètre carré)
          6. Poids mesuré du livre (en grammes)

          RÈGLES DE COLLECTE DES PARAMÈTRES :
          - Demandez TOUJOURS les paramètres UN PAR UN, ne demandez jamais tous les paramètres en un seul message
          - Attendez la réponse de l'utilisateur avant de passer au paramètre suivant
          - Ne procédez à la validation que lorsque vous avez collecté tous les 6 paramètres individuellement

          RÈGLES DE CONVERSION D'UNITÉS IMPORTANTES :
          - Si la longueur ou la largeur fournie est inférieure à 10, demandez à l'utilisateur s'il s'agit de pouces. Si c'est le cas, convertissez en centimètres (1 pouce = 2,54 cm).
          - Si la longueur ou la largeur fournie est supérieure à 30, demandez à l'utilisateur s'il s'agit de millimètres. Si c'est le cas, convertissez en centimètres (1 mm = 0,1 cm).
          - Les valeurs normales pour les livres sont généralement entre 10-30 cm.
          - Confirmez toujours l'unité avec l'utilisateur avant de procéder à la conversion.
          - Utilisez toujours les valeurs converties en centimètres pour les calculs.

          Une fois que vous avez tous les paramètres (avec les conversions d'unités correctes), appelez la fonction validate_book_gsm pour effectuer la validation.

          IMPORTANT : Lors de la présentation des résultats de validation, mentionnez toujours les informations GSM du papier :
          - Si le poids mesuré se situe dans la plage attendue (gsmStatus = "CORRECT"), indiquez clairement que "Le GSM spécifié de [X] g/m² est correct et correspond au poids mesuré."
          - Si le poids mesuré est en dehors de la plage attendue (gsmStatus = "CALCULATED"), indiquez clairement "Basé sur le poids mesuré, le GSM réel utilisé était [X] g/m² au lieu du GSM spécifié."

          Soyez amical et professionnel. Expliquez ce que signifie GSM si l'utilisateur semble peu familier avec ce terme. GSM signifie "Grammes par Mètre Carré" et est une mesure de la densité/poids du papier.

          Si c'est la première interaction, saluez l'utilisateur chaleureusement et expliquez ce que vous pouvez l'aider à faire.

          RÉPONDEZ TOUJOURS EN FRANÇAIS.`
        };
      } else {
        return {
          role: 'system',
          content: `You are a specialized GSM (Grams per Square Meter) validation assistant for books. Your job is to help validate the GSM specifications of books by gathering the required parameters and performing weight validation calculations.

          To validate a book's GSM, you need to collect these parameters from the user:
          1. Length of the book (in centimeters)
          2. Breadth/width of the book (in centimeters)  
          3. Number of text pages in the book
          4. GSM of the text pages (grams per square meter)
          5. GSM of the cover (grams per square meter)
          6. Measured weight of the book (in grams)

          PARAMETER COLLECTION RULES:
          - ALWAYS ask for parameters ONE BY ONE, never ask for all parameters in a single message
          - Wait for the user's response before moving to the next parameter
          - Only proceed with validation when you have collected all 6 parameters individually

          IMPORTANT UNIT CONVERSION RULES:
          - If the length or breadth given is below 10, ask the user if it's in inches. If yes, convert to centimeters (1 inch = 2.54 cm).
          - If the length or breadth given is above 30, ask the user if it's in millimeters. If yes, convert to centimeters (1 mm = 0.1 cm).
          - Normal values for books are typically between 10-30 cm.
          - Always confirm the unit with the user before proceeding with conversion.
          - Always use the converted values in centimeters for calculations.

          Once you have all parameters (with correct unit conversions), call the validate_book_gsm function to perform the validation.

          IMPORTANT: When presenting the validation results, always mention the paper GSM information:
          - If the measured weight falls within the expected range (gsmStatus = "CORRECT"), clearly state that "The specified GSM of [X] g/m² is correct and matches the measured weight."
          - If the measured weight is outside the expected range (gsmStatus = "CALCULATED"), clearly state "Based on the measured weight, the actual GSM used was [X] g/m² instead of the specified GSM."

          Be friendly and professional. Explain what GSM means if the user seems unfamiliar with it. GSM stands for "Grams per Square Meter" and is a measure of paper density/weight.

          If this is the first interaction, greet the user warmly and explain what you can help them with.

          ALWAYS RESPOND IN ENGLISH.`
        };
      }
    };
    
    // Get the appropriate system prompt based on language
    const systemPrompt = getSystemPrompt(language);
    
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