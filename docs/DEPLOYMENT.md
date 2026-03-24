# Deployment Guide

This document outlines how to take the multiplayer Tic-Tac-Toe app from a local development environment to a free, production-ready live deployment.

## 1. Backend Deployment (Nakama & PostgreSQL)

Because Nakama maintains persistent WebSocket connections and game loop ticks, it must be deployed on a virtual private server (VPS) rather than serverless functions. 

You can run this 100% free using the **AWS EC2 Free Tier** (`t2.micro` or `t3.micro`) or **Google Cloud Platform** (`e2-micro`). 

### Steps for VPS Deployment:
1. **Provision a Server:** Spin up an Ubuntu Linux instance on EC2, GCP, or DigitalOcean.
2. **Open the Ports:** In your Cloud Provider's Security Groups / Firewall, add an Inbound Rule allowing **TCP traffic on port 7350** (Nakama's primary API port).
3. **SSH into the Server & Install Docker:**
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose git npm
   ```
4. **Clone & Compile:**
   ```bash
   git clone https://github.com/your-username/Tic-Tac-Toe.git
   cd Tic-Tac-Toe/nakama
   npm ci
   npm run build
   ```
5. **Launch the Infrastructure:**
   ```bash
   cd ../infra
   sudo docker-compose up -d
   ```

---

## 2. Bridging the HTTPS Gap (Ngrok)

If you intend to host your Frontend on a secure platform like Vercel or Netlify (`https://`), modern browsers will block your game from talking to a bare IP address on an insecure `http://` port. This is known as the **Mixed Content** block.

If you don't own a personalized domain name to generate an SSL certificate, the easiest, zero-cost workaround is to tunnel your Nakama port utilizing `ngrok`.

**On your EC2/VPS Instance:**
1. Install Ngrok.
2. Run the tunnel against Nakama's port:
   ```bash
   ngrok http 7350
   ```
3. Ngrok will output a secure URL, e.g., `https://1234abcd.ngrok-free.app`.

---

## 3. Frontend Deployment (Vercel / Netlify)

The React frontend handles all rendering logic and simply needs a static host. 

**Steps:**
1. Open the `/frontend` directory on your local machine.
2. Create or modify your `.env` file to point exactly to the Ngrok secure tunnel you just created. **Do not include the `https://` prefix!**

```env
# Point to your Ngrok URL (or your domain name if you bought one)
VITE_NAKAMA_HOST=1234abcd.ngrok-free.app

# Ngrok wraps traffic in standard HTTPS, so we use port 443
VITE_NAKAMA_PORT=443

# Required true to use secure WSS WebSocket connections
VITE_NAKAMA_USE_SSL=true

VITE_NAKAMA_SERVER_KEY=defaultkey
```

3. Run `npm run build` locally.
4. Drag and drop the generated `/dist` folder into Vercel, Netlify, or Cloudflare Pages. 

Players can now access your Vercel URL, and all gameplay logic will be securely routed through the Ngrok tunnel into your EC2 Nakama server!
