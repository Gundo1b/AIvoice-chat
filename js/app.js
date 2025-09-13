document.addEventListener('DOMContentLoaded', () => {
  // --- Tab Navigation Logic ---
  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      pages.forEach(page => {
        page.classList.toggle('active', page.id === target);
      });
      if (target === 'stories') {
        // Fetch top headlines by default when stories tab is activated
        fetchStories('top-headlines');
      }
    });
  });

  // --- Live Chat Functionality ---
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const imageBtn = document.getElementById('image-btn');
  const imageInput = document.getElementById('image-input');
  const voiceBtn = document.getElementById('voice-btn');

  // --- AI Image Generator Elements ---
  const imagePromptInput = document.getElementById('image-prompt-input');
  const generateImageBtn = document.getElementById('generate-image-btn');
  const imageResults = document.getElementById('image-results');

  // --- Stories Page Elements ---
  const storiesContainer = document.getElementById('stories-container');
  const categoryButtons = document.querySelectorAll('.category-btn');


  const apiToken = 'YOUR_GITHUB_TOKEN_HERE';
  const endpoint = 'https://models.github.ai/inference';
  const model = 'openai/gpt-4.1'; // As specified in your example

  // Store conversation history
  let conversationHistory = [
    { role: "system", content: "You are a helpful assistant." }
  ];

  const handleSendMessage = async () => {
    const messageText = chatInput.value.trim();
    if (messageText === '') return;

    // Add user message to UI and history
    addMessage(messageText, 'user');
    conversationHistory.push({ role: "user", content: messageText });
    chatInput.value = '';

    // Add thinking indicator
    const thinkingMessage = addMessage('...', 'bot');

    try {
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          model: model,
          messages: conversationHistory,
          temperature: 0.7,
          top_p: 1.0,
        })
      });

      if (!response.ok) {
        const errorBody = await response.json();
        let errorMessage = errorBody.error?.message || 'Unknown error';

        // Check for rate limit error and convert seconds to minutes
        const rateLimitMatch = errorMessage.match(/Please wait (\d+) seconds/);
        if (rateLimitMatch && rateLimitMatch[1]) {
          const seconds = parseInt(rateLimitMatch[1], 10);
          const minutes = Math.ceil(seconds / 60);
          errorMessage = errorMessage.replace(/Please wait (\d+) seconds/, `Please wait ${minutes} minutes`);
        }
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorMessage}`);
      }

      const data = await response.json();
      const botReply = data.choices[0].message.content;
      
      // Update thinking message with the parsed Markdown HTML reply
      thinkingMessage.firstChild.innerHTML = marked.parse(botReply);

      // Add bot reply to history
      conversationHistory.push({ role: "assistant", content: botReply });

    } catch (error) {
      console.error("Error calling AI model:", error);
      thinkingMessage.firstChild.textContent = `Error: ${error.message}`;
    }
  };

  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });

  imageBtn.addEventListener('click', () => {
    imageInput.click();
  });

  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target.result;
        const messageText = `<img src="${imageUrl}" alt="user image" style="max-width: 100%;"><br>What is in this image?`;
        addMessage(messageText, 'user');
        conversationHistory.push({ role: "user", content: "What is in this image?" });
        // Add thinking indicator
        const thinkingMessage = addMessage('...', 'bot');
        // Here you would call the image recognition API
        // For now, we will just simulate a response
        setTimeout(() => {
          const botReply = "I can see a beautiful landscape in this image.";
          thinkingMessage.firstChild.innerHTML = marked.parse(botReply);
          conversationHistory.push({ role: "assistant", content: botReply });
        }, 2000);
      };
      reader.readAsDataURL(file);
    }
  });

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  voiceBtn.addEventListener('click', () => {
    recognition.start();
  });

  recognition.addEventListener('start', () => {
    voiceBtn.classList.add('active');
  });

  recognition.addEventListener('end', () => {
    voiceBtn.classList.remove('active');
  });

  recognition.addEventListener('error', (e) => {
    console.error('Speech recognition error:', e.error);
    alert(`Speech recognition error: ${e.error}`);
  });

  recognition.addEventListener('result', (e) => {
    const transcript = Array.from(e.results)
      .map(result => result[0])
      .map(result => result.transcript)
      .join('');
    chatInput.value = transcript;
  });

  let voices = [];
  const populateVoiceList = () => {
    voices = speechSynthesis.getVoices();
  };

  populateVoiceList();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
  }

  generateImageBtn.addEventListener('click', async () => {
    const prompt = imagePromptInput.value.trim();
    if (prompt === '') {
      alert('Please enter a prompt for image generation.');
      return;
    }

    imageResults.innerHTML = '<div class="loading-spinner"></div><p>Generating image...</p>';

    const url = `https://ai-image-generator16.p.rapidapi.com/generate-image?prompt=${encodeURIComponent(prompt)}`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY_HERE',
        'x-rapidapi-host': 'ai-image-generator16.p.rapidapi.com'
      }
    };

    try {
      const response = await fetch(url, options);
      let imageUrl = '';

      if (response.redirected) {
        imageUrl = response.url;
      } else if (response.headers.get('content-type') && response.headers.get('content-type').startsWith('image/')) {
        const imageBlob = await response.blob();
        imageUrl = URL.createObjectURL(imageBlob);
      } else {
        const result = await response.json();
        console.log(result);
        if (result && result.output_url) {
          imageUrl = result.output_url;}
         else {
          imageResults.innerHTML = `<p>Error: Could not generate image. ${result.message || 'Unknown error.'}</p>`;
          return;
        }
      }

      if (imageUrl) {
        imageResults.innerHTML = `
          <img src="${imageUrl}" alt="${prompt}" style="max-width: 100%; height: auto;">
          <button class="download-btn" data-image-url="${imageUrl}" data-file-name="${prompt.replace(/\s/g, '_')}.png">Download Image</button>
        `;

        const downloadBtn = imageResults.querySelector('.download-btn');
        downloadBtn.addEventListener('click', (e) => {
          const urlToDownload = e.target.dataset.imageUrl;
          const fileName = e.target.dataset.fileName;
          const a = document.createElement('a');
          a.href = urlToDownload;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
      }
    } catch (error) {
      console.error(error);
      imageResults.innerHTML = `<p>Error: ${error.message}</p>`;
    }
  });

  const fetchStories = async (category) => {
    storiesContainer.innerHTML = '<div class="loading-spinner"></div><p>Loading stories...</p>';

    let url = '';
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY_HERE',
        'x-rapidapi-host': ''
      }
    };

    if (category === 'top-headlines') {
      url = 'https://real-time-news-data.p.rapidapi.com/top-headlines?limit=500&country=US&lang=en';
      options.headers['x-rapidapi-host'] = 'real-time-news-data.p.rapidapi.com';
    } else if (category === 'entertainment') {
      url = 'https://google-news13.p.rapidapi.com/entertainment?lr=en-US';
      options.headers['x-rapidapi-host'] = 'google-news13.p.rapidapi.com';
    } else {
      storiesContainer.innerHTML = '<p>Invalid news category.</p>';
      return;
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      console.log(result);

      if (result && result.data && result.data.length > 0) {
        storiesContainer.innerHTML = ''; // Clear loading message
        result.data.forEach(story => {
          const storyElement = document.createElement('div');
          storyElement.classList.add('story-item');
          storyElement.innerHTML = `
            <h3><a href="${story.link}" target="_blank">${story.title}</a></h3>
            <p>${story.snippet}</p>
            ${story.image ? `<img src="${story.image}" alt="${story.title}" style="max-width: 100%; height: auto;">` : ''}
            <p><small>Source: ${story.publisher}</small></p>
          `;
          storiesContainer.appendChild(storyElement);
        });
      } else if (result && result.articles && result.articles.length > 0) { // For google-news13 API
        storiesContainer.innerHTML = ''; // Clear loading message
        result.articles.forEach(story => {
          const storyElement = document.createElement('div');
          storyElement.classList.add('story-item');
          storyElement.innerHTML = `
            <h3><a href="${story.link}" target="_blank">${story.title}</a></h3>
            <p>${story.description}</p>
            ${story.image ? `<img src="${story.image}" alt="${story.title}" style="max-width: 100%; height: auto;">` : ''}
            <p><small>Source: ${story.publisher}</small></p>
          `;
          storiesContainer.appendChild(storyElement);
        });
      }
      else {
        storiesContainer.innerHTML = '<p>No stories found.</p>';
      }
    } catch (error) {
      console.error(error);
      storiesContainer.innerHTML = `<p>Error loading stories: ${error.message}</p>`;
    }
  };

  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const category = button.dataset.category;
      fetchStories(category);
    });
  });

  function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    if (sender === 'user') {
      messageElement.innerHTML = text;
    } else {
      const messageContent = document.createElement('div');
      messageContent.innerHTML = text;
      const speakerBtn = document.createElement('button');
      speakerBtn.classList.add('speaker-btn');
      speakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      speakerBtn.addEventListener('click', () => {
        const utterance = new SpeechSynthesisUtterance(messageContent.textContent);
        const selectedVoice = voices.find(voice => voice.name === 'Microsoft Zira Desktop - English (United States)') || 
                              voices.find(voice => voice.lang === 'en-US' && voice.name.toLowerCase().includes('female')) ||
                              voices.find(voice => voice.lang === 'en-US' && !voice.name.toLowerCase().includes('google'));
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        speechSynthesis.speak(utterance);
      });
      messageElement.appendChild(messageContent);
      messageElement.appendChild(speakerBtn);
    }
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
  }
});