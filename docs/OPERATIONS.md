# Operations Runbook

## Service Management
The application runs under a systemd unit named `insta-connect-demo`.

```bash
# reload unit files after edits
sudo systemctl daemon-reload

# start / stop / restart
sudo systemctl start insta-connect-demo
sudo systemctl stop insta-connect-demo
sudo systemctl restart insta-connect-demo

# view status and recent logs
sudo systemctl status insta-connect-demo
sudo journalctl -u insta-connect-demo -n 100 --no-pager
```

The service executes from `/root/insta-connect-demo` and loads secrets via Doppler using `/usr/bin/doppler run`.

## Secrets Location
- Doppler project: `insta-connect-demo`, config: `dev_insta`.
- Service token stored at `/etc/insta-connect-demo/doppler.env` (permissions `600`).
- Rotate tokens in Doppler, update the file, then restart the service.
- The legacy `/etc/insta-connect-demo/.env` file has been removed.

## Deployment Steps
1. Pull latest code: `git pull` inside `/root/insta-connect-demo`.
2. Install dependencies: `npm install`.
3. Restart the service: `systemctl restart insta-connect-demo` (Doppler will inject secrets automatically).

## Troubleshooting
- If the service fails to stay active, run `journalctl -u insta-connect-demo -n 200` for stack traces.
- Ensure Doppler token is valid: `doppler whoami` or `doppler secrets download --project=insta-connect-demo --config=dev_insta`.
- To clear a stuck process, `pkill -f "node server.js"` before restarting the unit.
- Confirm port 3000 availability or adjust `PORT` in Doppler and restart.

