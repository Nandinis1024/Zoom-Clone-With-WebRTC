const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001'
})
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream)

  myPeer.on('call', call => {
    call.answer(stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream)
    })
  })

  socket.on('user-connected', userId => {
    connectToNewUser(userId, stream)
  })
})



 // Event listener for submitting chat messages
 const messageForm = document.getElementById('message-form');
 const messageInput = document.getElementById('message-input');
 messageForm.addEventListener('submit', (e) => {
   e.preventDefault();
   const message = messageInput.value;
   const myId = myPeer.id;
   
   sendChatMessage(message, myId);
   messageInput.value = '';
 });


 function sendChatMessage(message, myId) {
  socket.emit('chat message', message, {myId: myId});
}

  // Function to display chat messages
  function displayChatMessage(message, username) {
    const chatMessages = document.getElementById('messages');
    const li = document.createElement('li');
    li.innerHTML = `${username}: ${message.message}`;
    chatMessages.appendChild(li);
  }

  // Listen for chat messages and display them
  socket.on('chat message', (message, username) => {
    //console.log(my_user_id)
    displayChatMessage(message, username);
  });


socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
  //console.log(id);
})

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call
}

function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}
