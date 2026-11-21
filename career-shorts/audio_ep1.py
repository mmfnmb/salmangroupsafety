# Synthesized soundtrack for episode 1 (no external samples): music bed that changes mood per scene + sound effects.
import numpy as np, wave
SR=44100; DUR=56; N=SR*DUR; out=np.zeros(N)
def tone(f,d,amp=.2,kind='sine',att=.01,rel=.2):
    t=np.arange(int(SR*d))/SR
    w=np.sin(2*np.pi*f*t) if kind=='sine' else (2*(t*f%1)-1)*.5 if kind=='saw' else np.sign(np.sin(2*np.pi*f*t))*.4
    env=np.minimum(1,t/att)*np.minimum(1,(d-t)/rel).clip(0,1); return w*env*amp
def add(x,at):
    i=int(at*SR); x=x[:max(0,N-i)]; out[i:i+len(x)]+=x
def noise(d,amp=.3,decay=20):
    t=np.arange(int(SR*d))/SR; return np.random.randn(len(t))*np.exp(-t*decay)*amp
def kick(at): t=np.arange(int(SR*.25))/SR; add(np.sin(2*np.pi*(120*np.exp(-t*18)+45)*t)*np.exp(-t*12)*.5,at)
def snare(at): add(noise(.18,.18,25),at)
def hat(at): add(np.diff(noise(.05,.08,80),prepend=0)*3,at)
n2f=lambda n:440*2**((n-69)/12)
def chord(notes,at,d,amp=.05,kind='saw'):
    for n in notes: add(tone(n2f(n),d,amp,kind,.05,.4),at)
# 0-4 card: rising riser + hit
t=np.arange(int(SR*1))/SR; add(np.sin(2*np.pi*(200+600*t)*t)*t*.15,0); kick(1.0); add(noise(1.2,.25,4),1.0)
# 4-18 happy-ish street groove (C major)
prog=[[60,64,67],[57,60,64],[53,57,60],[55,59,62]]
for b in range(14):
    at=4.2+b*1.0; chord(prog[b%4],at,1.0,.035)
    kick(at); hat(at+.5); 
    if b%2: snare(at+.5)
    add(tone(n2f(prog[b%4][0]-24),.9,.12,'sine'),at)
# kicks of the ball in scene 1
for k in np.arange(4.2,10,2.2): add(noise(.08,.4,60),k+.05); kick(k+.05)
# 10-18 laughter-ish (rival)
for i in range(16): add(tone(n2f(72+(i%3)*2),.09,.06,'square'),11.8+i*0.22)
add(noise(.6,.4,6),16.4); kick(16.4)  # VS hit
# 18-26 match: drums faster, goal horns
for b in range(16):
    at=18+b*.5; kick(at); hat(at+.25)
for gidx in range(1,6):
    at=18+gidx*1.4-.9; add(noise(.1,.5,40),at); add(tone(n2f(50),.5,.15,'saw',.01,.3),at+.4)
# 26-34 sad piano (A minor)
sad=[[57,60,64],[53,57,60],[48,52,55],[52,55,59]]
for b in range(8):
    at=26+b*1.0
    for j,n in enumerate(sad[b%4]): add(tone(n2f(n+12),1.6,.07,'sine',.005,1.2),at+j*.12)
# 34-44.5 build-up to hopeful theme
for b in range(10):
    at=34+b*1.05; chord([62,66,69] if b%2 else [59,62,66],at,1.05,.03+.004*b)
    if b>=3: kick(at); snare(at+.52)
    if b>=5: hat(at+.26); hat(at+.78)
# 44.5-56 choices: tense pulse + ticking
for b in range(23):
    at=44.5+b*.5; add(tone(n2f(45),.3,.1,'sine'),at); hat(at+.25)
for i,at in enumerate([45.0,45.35,45.7]): add(tone(n2f(76+i*3),.15,.1,'square'),at)
out=np.tanh(out*1.4)*.8
st=np.stack([out,out],1); data=(st*32767).astype('<i2').tobytes()
w=wave.open('ep1.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data); w.close()
