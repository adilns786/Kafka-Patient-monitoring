var currentStream = -1
var pubnub = null
var currentListener = null
var MAX_LIST_ITEMS = 200

// Interactive Demo only
var receivedMessageCount = {}
// End Interactive Demo only

function onload() {
  var streamSelect = document.getElementById('streamSelect')
  for (var i = 0; i < streams.stream.length; i++) {
    var opt = streams.stream[i].name
    var li = document.createElement('li')
    var lia = document.createElement('a')
    lia.textContent = opt
    lia.value = opt
    lia.id = i
    lia.setAttribute('class', 'dropdown-item')
    lia.setAttribute('href', '#')
    li.appendChild(lia)
    streamSelect.appendChild(li)

    receivedMessageCount[i] = 0
  }

  $('.dropdown-menu li a').on('click', function () {
    var id = $(this).attr('id')
    onStreamSelect(id)
  })
}

function onPause() {
  clearCodeSnippet()
  if (pubnub !== null) {
    pubnub.unsubscribeAll()
  }
}

function onStreamSelect(selectedStream) {
  if (selectedStream != currentStream) {
    currentStream = selectedStream
    console.log('Switching stream to: ' + streams.stream[currentStream].name)
    document.getElementById('dropdownMenuLink').textContent =
      streams.stream[currentStream].name
    $('#streamKey').html('' + streams.stream[currentStream].subKey)
    $('#channelName').html('' + streams.stream[currentStream].channel)
    $('#description').html('' + streams.stream[currentStream].description)

    if (currentStream == 0) {
      onPause()
      return
    }

    showCodeSnippet(
      streams.stream[currentStream].subKey,
      streams.stream[currentStream].channel
    )

    // Unsubscribe from existing stream
    if (pubnub !== null) {
      pubnub.unsubscribeAll()
      pubnub.removeListener(currentListener)
    }

    pubnub = new PubNub({
      uuid: 'RealTimeDemo',
      subscribeKey: streams.stream[currentStream].subKey
    })

    // Only Twitter stream
    currentListener = {
      message: payload => {
        addFormattedMessageTwitter(payload)
      }
    }
    pubnub.addListener(currentListener)

    pubnub.subscribe({
      channels: [streams.stream[currentStream].channel]
    })
  }
}

function addFormattedMessageTwitter(payload) {
  if (
    payload == null ||
    payload.message == null ||
    payload.message.user == null ||
    payload.message.place == null
  ) {
    return
  }

  var li = document.createElement('li')
  li.setAttribute('class', 'list-group-item')
  var outputHtml = ''
  outputHtml +=
    "<b>Source: </b>Twitter <i class='fa-brands fa-twitter fa-2xl' style='float:right'></i><br>"
  outputHtml +=
    "<b>Text: </b><a href='https://twitter.com/" +
    payload.message.user.screen_name +
    '/status/' +
    payload.message.id_str +
    "' target='new'>" +
    payload.message.text +
    '</a><br>'
  outputHtml += '<b>Posted from: </b>' + payload.message.source + '<br>'
  outputHtml +=
    '<b>Tweeted from location: </b>' + payload.message.place.country + '<br>'
  outputHtml +=
    "<b>User name: </b><a href='https://twitter.com/" +
    payload.message.user.screen_name +
    "' target='new'>" +
    payload.message.user.screen_name +
    '</a><br>'
  outputHtml +=
    '<b>User profile location: </b>' + payload.message.user.location + '<br>'
  outputHtml +=
    '<b>User follower count: </b>' +
    payload.message.user.followers_count +
    '<br>'
  outputHtml += '<b>Timestamp: </b>' + new Date(payload.timetoken / 10000)
  li.innerHTML = outputHtml

  var list = document.getElementById('messageList')
  list.insertBefore(li, list.firstChild)

  // Interactive Demo only
  demoActionCompleted(currentStream, 50, 'Receive 50 Twitter messages')
  // End Interactive Demo only

  capElements()
}

function capElements() {
  var list = document.getElementById('messageList')
  if (list.childElementCount > MAX_LIST_ITEMS)
    list.removeChild(list.lastElementChild)
}

function showCodeSnippet(subKey, channelName) {
  var codeBlock = document.getElementById('code-block')
  var code =
    "<code><small><pre>\
var pubnub = new PubNub({ \n\
  uuid: 'MyIdentifier', \n\
  subscribeKey: \n\
    '" +
    subKey +
    "' \n\
}); \n\
pubnub.addListener({ \n\
  message: function(message) { \n\
    console.log(message.message);} \n\
}); \n\
pubnub.subscribe({ \n\
  channels: ['" +
    channelName +
    "'] \n\
}); \n\
</pre></small></code>"
  codeBlock.innerHTML = code
}

function clearCodeSnippet() {
  var codeBlock = document.getElementById('code-block')
  codeBlock.innerHTML = ''
}

function demoActionCompleted(currentStream, triggerVal, actionText) {
  if (receivedMessageCount[currentStream] < triggerVal - 1) {
    receivedMessageCount[currentStream]++
  } else {
    actionCompleted({
      action: actionText,
      blockDuplicateCalls: true,
      debug: false
    })
  }
}
