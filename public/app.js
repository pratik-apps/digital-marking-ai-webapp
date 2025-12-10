function deriveKey(passphrase){return CryptoJS.PBKDF2(passphrase,"dm-secret-salt",{keySize:256/32,iterations:2000});}
function encryptMessage(plaintext,passphrase){const key=deriveKey(passphrase);const iv=CryptoJS.lib.WordArray.random(16);const encrypted=CryptoJS.AES.encrypt(plaintext,key,{iv});const data=iv.concat(encrypted.ciphertext);return CryptoJS.enc.Base64.stringify(data);}
function decryptMessage(ciphertextB64,passphrase){try{const data=CryptoJS.enc.Base64.parse(ciphertextB64);const iv=CryptoJS.lib.WordArray.create(data.words.slice(0,4),16);const ct=CryptoJS.lib.WordArray.create(data.words.slice(4),data.sigBytes-16);const key=deriveKey(passphrase);const decrypted=CryptoJS.AES.decrypt({ciphertext:ct},key,{iv});return CryptoJS.enc.Utf8.stringify(decrypted);}catch(e){return null;}}

const chatWindow=document.getElementById('chat-window');
const input=document.getElementById('message-input');
const sendBtn=document.getElementById('send-btn');
const passInput=document.getElementById('passphrase');
const statusSpan=document.getElementById('conn-status');

let ws;

function connect(){const loc=window.location;const proto=loc.protocol==='https:'?'wss:':'ws:';const wsUrl=proto+'//'+loc.host;ws=new WebSocket(wsUrl);ws.addEventListener('open',()=>{statusSpan.textContent='Connected to AI node';});ws.addEventListener('close',()=>{statusSpan.textContent='Disconnected. Reconnecting...';setTimeout(connect,2000);});ws.addEventListener('message',async event=>{let text;if(typeof event.data==='string'){text=event.data;}else if(event.data instanceof Blob){text=await event.data.text();}else{console.warn('Unknown WS data type',typeof event.data);return;}let payload;try{payload=JSON.parse(text);}catch(e){console.error('WS JSON parse error',e,text);return;}if(payload.type==='cipher'){handleIncomingCipher(payload);}});}connect();

function createMessageElement({id,cipher,plain}){const wrapper=document.createElement('div');wrapper.className='message';wrapper.dataset.id=id;const meta=document.createElement('span');meta.className='meta';meta.textContent='AI / Partner (encrypted)';const cipherDiv=document.createElement('div');cipherDiv.className='cipher';cipherDiv.textContent=cipher;const plainDiv=document.createElement('div');plainDiv.className='plain hidden';plainDiv.textContent=plain||'';wrapper.appendChild(meta);wrapper.appendChild(cipherDiv);wrapper.appendChild(plainDiv);chatWindow.appendChild(wrapper);chatWindow.scrollTop=chatWindow.scrollHeight;return{wrapper,plainDiv};}

function sendPlainMessage(){const msg=input.value.trim();if(!msg||!ws||ws.readyState!==WebSocket.OPEN)return;const id=Date.now().toString()+'-'+Math.random().toString(16).slice(2);const tempKey=passInput.value||'default-cover-key';const cipher=encryptMessage(msg,tempKey);createMessageElement({id,cipher,plain:''});ws.send(JSON.stringify({type:'cipher',id,body:cipher}));input.value='';}

function handleIncomingCipher({id,body}){createMessageElement({id,cipher:body,plain:''});}

function tryDecryptAll(){const key=passInput.value.trim();if(!key)return;document.querySelectorAll('.message').forEach(msg=>{const cipherEl=msg.querySelector('.cipher');const plainEl=msg.querySelector('.plain');const cipher=cipherEl.textContent;const plain=decryptMessage(cipher,key);if(plain){plainEl.textContent=plain;plainEl.classList.remove('hidden');}else{plainEl.textContent='[Wrong key]';plainEl.classList.remove('hidden');}});}

passInput.addEventListener('change',()=>{console.log('onChange started');tryDecryptAll();console.log('onChange completed');});
passInput.addEventListener('blur',tryDecryptAll);
sendBtn.addEventListener('click',sendPlainMessage);input.addEventListener('keydown',e=>{if(e.key==='Enter')sendPlainMessage();});
