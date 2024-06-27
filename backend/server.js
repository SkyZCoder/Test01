const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/generate-reading-material', async (req, res) => {
  const model = req.body.model || 'openai/gpt-4o';

  const generatePrompt = () => {
    return `Generate an IELTS reading practice paragraph followed by four questions and four answers for each question. Start your answer with a paragraph. Format it as follows:
    [Your paragraph here]
    Question 1: [Your question here]
    A: [Answer option a]
    B: [Answer option b]
    C: [Answer option c]
    D: [Answer option d]
    Question 2: [Your question here]
    A: [Answer option a]
    B: [Answer option b]
    C: [Answer option c]
    D: [Answer option d]
    Question 3: [Your question here]
    A: [Answer option a]
    B: [Answer option b]
    C: [Answer option c]
    D: [Answer option d]
    Question 4: [Your question here]
    A: [Answer option a]
    B: [Answer option b]
    C: [Answer option c]
    D: [Answer option d]
    Answers: 
    [Answer for question 1 here (The answer only A B C or D)]
    [Answer for question 2 here (The answer only A B C or D)]
    [Answer for question 3 here (The answer only A B C or D)]
    [Answer for question 4 here (The answer only A B C or D)]`;
  };

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: model,
      messages: [{ role: 'system', content: generatePrompt() }],
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.YOUR_OPENAI_API_KEY}`
      }
    });

    const text = response.data.choices[0].message.content.trim();
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const paragraph = lines[0];
    const questions = [];
    const answers = [];

    let currentQuestion = null;

    lines.slice(1).forEach(line => {
      if (line.startsWith('Question')) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          question: line,
          options: []
        };
      } else if (line.startsWith('A:') || line.startsWith('B:') || line.startsWith('C:') || line.startsWith('D:')) {
        if (currentQuestion) {
          currentQuestion.options.push(line.substring(3).trim());  // Only push the answer text, not the prefix
        }
      } else if (/^[A-D]$/.test(line.trim())) {  // Match lines with only A, B, C, or D
        answers.push(line.trim());
      }
    });

    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    res.json({ paragraph, questions, answers });
  } catch (error) {
    console.error('Error fetching reading material:', error);
    res.status(500).json({ error: 'Failed to fetch reading material' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});