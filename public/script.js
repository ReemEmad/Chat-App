const socket = io("http://localhost:3000")
const messageContainer = document.getElementById("message-container")
const history = document.getElementById("message-container-previous")
const messageForm = document.getElementById("send-container")
const roomContainer = document.getElementById("room-container")
const messageInput = document.getElementById("message-input")

if (messageForm != null) {
  const name = prompt("What is your name?")
  appendMessage("You joined")
  socket.emit("new-user", roomName, name)

  socket.on("chat-message", (data) => {
    appendMessage(`${data.name} : ${data.message}`)
  })
  messageForm.addEventListener("submit", (e) => {
    e.preventDefault()
    const message = messageInput.value
    appendMessage(`You: ${message}`)
    socket.emit("send-chat-message", roomName, message)
    messageInput.value = ""
  })
}

socket.on("room-created", (room) => {
  const roomELement = document.createElement("div")
  roomELement.innerText = room
  const roomLink = document.createElement("a")
  roomLink.href = `/${room}`
  roomLink.innerText = "join"
  roomContainer.append(roomELement)
  roomContainer.append(roomLink)
})

socket.on("user-connected", (name) => {
  appendMessage(`${name} connected`)
})
socket.on("user-disconnected", (name) => {
  appendMessage(`${name} disconnected`)
})

function appendMessage(message) {
  const messageElement = document.createElement("div")
  messageElement.innerText = message
  messageContainer.append(messageElement)
}
