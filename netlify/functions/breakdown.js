exports.handler = async function(event, context) {
  // CORS Headers so your website can talk to this function securely
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests from the browser
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const type = body.type;
    const query = body.query;
    
    // Fetch the API key from Netlify Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: "Missing GEMINI_API_KEY in Netlify settings." }) 
      };
    }

    // Prompt Engineering based on the type of request
    let systemInstruction = "";
    if (type === "topic") {
        systemInstruction = "אתה עוזר למדריכי נוער בסיעור מוחות. המשתמש ייתן לך נושא חינוכי או חברתי. תפקידך היחיד הוא לפרק את הנושא ל-3 עד 5 תתי-נושאים או רכיבי בסיס מהם הוא מורכב. החזר את התשובה כרשימה ממוספרת פשוטה בלבד, ללא הקדמות, ללא סיכומים וללא הסברים ארוכים. אל תציע למשתמש רעיונות לפעילות, תן לו רק את אבני הבניין כדי שיוכל לחשוב עליהן לבד.";
    } else {
        systemInstruction = "אתה עוזר למדריכי נוער בסיעור מוחות. המשתמש ייתן לך שם של משחק או מתודה. תפקידך היחיד הוא לפרק את המתודה ל-3 עד 5 רכיבים מכניים או חוקי בסיס (למשל: לוח, תורים, קוביות, ניקוד, התייעצות קבוצתית). החזר את התשובה כרשימה ממוספרת פשוטה בלבד, ללא הקדמות, ללא סיכומים, וללא הצעות שדרוג למשחק. רק פירוק טכני כדי שהמדריך יפעיל את הראש שלו.";
    }

    const prompt = `פרק את ה${type === 'topic' ? 'נושא' : 'מתודה'} הבא/ה לרכיבים: ${query}`;

    // Call the Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();

    if (!response.ok) {
         return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: data.error?.message || "Google API Error" })
         };
    }

    const text = data.candidates[0].content.parts[0].text;

    // Send successful response back to website
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: text })
    };

  } catch (error) {
    // Catch any crash and report it nicely
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Server Error" })
    };
  }
};