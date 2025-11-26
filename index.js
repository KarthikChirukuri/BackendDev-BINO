const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
app.use(helmet()); //helps to prevent some browser vulnerabilities
app.use(cors());
app.use(express.json());
app.use(morgan('tiny')); //used to print every tiny logs

const PORT = 3000;

app.get('/', (req, res) => {
  res.send({ ok: true, service: 'Bino Dictionary API connector' });
});


app.get('/define', async (req, res) => {
  try {
    const word = (req.query.word || '').trim();
    if (!word) return res.status(400).json({ error: 'Missing query param: word' });

    //Dictonary API - found this through GPT
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`; //here we need to give ?word = in url as it is get we will use req.query

    const resp = await axios.get(apiUrl, { timeout: 8000 });
    const data = resp.data;

    //lets simplify ans summarize the response
    const simplified = data.map(entry => {
      const meanings = (entry.meanings || []).map(m => {
        const defs = (m.definitions || []).slice(0,2).map(d => ({
          definition: d.definition || '',
          example: d.example || ''
        }));
        return {
          partOfSpeech: m.partOfSpeech || '',
          definitions: defs
        };
      });
      return {
        word: entry.word || '',
        phonetic: entry.phonetic || entry.phonetics?.[0]?.text || '',
        origin: entry.origin || '',
        meanings
      };
    });

    const summary = simplified.slice(0,1).map(s => {
      const firstMeaning = s.meanings[0];
      const firstDef = firstMeaning && firstMeaning.definitions[0] ? firstMeaning.definitions[0].definition : '';
      const example = firstMeaning && firstMeaning.definitions[0] ? firstMeaning.definitions[0].example : '';
      return {
        word: s.word,
        phonetic: s.phonetic,
        short: firstDef,
        example: example || '',
        raw: s
      };
    })[0];

    return res.json({ success: true, result: summary });
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ success: false, error: 'Word not found' });
    }
    console.error(err && err.toString ? err.toString() : err);
    return res.status(500).json({ success: false, error: 'Server error', details: err.message || '' });
  }
});

app.listen(PORT, () => {
  console.log(`Bino Dictionary API connector listening on port ${PORT}`);
});
