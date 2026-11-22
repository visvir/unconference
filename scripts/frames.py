import subprocess, base64, json, sys, os, tempfile
src, out = sys.argv[1], sys.argv[2]
dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",src]).strip())
frames=[]
d=tempfile.mkdtemp()
for i in range(8):
    t=round(dur*(i+0.5)/8,1); f=f"{d}/{i}.jpg"
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(t),"-i",src,"-frames:v","1","-vf","scale=480:-2","-q:v","5",f],check=True)
    frames.append({"t":t,"data":base64.b64encode(open(f,"rb").read()).decode()})
json.dump({"frames":frames,"leg":"right"},open(out,"w"))
