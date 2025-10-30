const MAX_LIST_ITEMS = 200;
let ws = null;
let messageCount = 0;
let positiveCount = 0;
let negativeCount = 0;

function onload() {
  connectWebSocket();
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    console.log('✅ WebSocket connected');
    document.getElementById('connectionStatus').textContent = 'Connected ✓';
    document.getElementById('connectionStatus').parentElement.classList.remove('alert-info');
    document.getElementById('connectionStatus').parentElement.classList.add('alert-success');
  };

  ws.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    addFormattedMessageTwitter(payload);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    document.getElementById('connectionStatus').textContent = 'Error ✗';
    document.getElementById('connectionStatus').parentElement.classList.add('alert-danger');
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected. Reconnecting...');
    document.getElementById('connectionStatus').textContent = 'Reconnecting...';
    setTimeout(connectWebSocket, 3000);
  };
}

function addFormattedMessageTwitter(payload) {
  if (!payload || !payload.message || !payload.message.user) {
    return;
  }

  const msg = payload.message;
  messageCount++;
  
  // Update stats
  if (msg.sentiment_label === 'Positive') positiveCount++;
  if (msg.sentiment_label === 'Negative') negativeCount++;
  
  document.getElementById('msgCount').textContent = messageCount;
  document.getElementById('posCount').textContent = positiveCount;
  document.getElementById('negCount').textContent = negativeCount;

  const li = document.createElement('li');
  li.setAttribute('class', 'list-group-item');
  
  // Sentiment badge color
  let sentimentColor = 'secondary';
  if (msg.sentiment_label === 'Positive') sentimentColor = 'success';
  if (msg.sentiment_label === 'Negative') sentimentColor = 'danger';
  
  let outputHtml = '';
  outputHtml += `<div class="d-flex justify-content-between align-items-center">`;
  outputHtml += `<b>Twitter</b> <i class='fa-brands fa-twitter fa-2xl' style='color: #1DA1F2'></i>`;
  outputHtml += `</div>`;
  
  outputHtml += `<div class="mt-2">`;
  outputHtml += `<b>Text: </b><a href='https://twitter.com/${msg.user.screen_name}/status/${msg.id_str}' target='_blank'>${msg.text}</a><br>`;
  outputHtml += `<b>User: </b><a href='https://twitter.com/${msg.user.screen_name}' target='_blank'>@${msg.user.screen_name}</a> `;
  outputHtml += `<span class="badge bg-info">${msg.follower_category}</span> (${msg.user.followers_count} followers)<br>`;
  outputHtml += `<b>Location: </b>${msg.user.location || 'N/A'} | <b>Country: </b>${msg.place?.country || 'N/A'}<br>`;
  outputHtml += `</div>`;
  
  outputHtml += `<div class="mt-2">`;
  outputHtml += `<span class="badge bg-${sentimentColor}">Sentiment: ${msg.sentiment_label} (${msg.sentiment_score})</span> `;
  outputHtml += `<span class="badge bg-secondary">${msg.word_count} words</span> `;
  outputHtml += `<span class="badge bg-secondary">${msg.text_length} chars</span> `;
  if (msg.has_hashtags) outputHtml += `<span class="badge bg-primary">#</span> `;
  if (msg.has_mentions) outputHtml += `<span class="badge bg-primary">@</span> `;
  outputHtml += `</div>`;
  
  outputHtml += `<small class="text-muted d-block mt-2">Processed: ${new Date(msg.processed_at).toLocaleString()}</small>`;
  
  li.innerHTML = outputHtml;

  const list = document.getElementById('messageList');
  list.insertBefore(li, list.firstChild);

  capElements();
}

function capElements() {
  const list = document.getElementById('messageList');
  if (list.childElementCount > MAX_LIST_ITEMS) {
    list.removeChild(list.lastElementChild);
  }
}