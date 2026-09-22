#!/usr/bin/env bash
#
# Prepare a fresh Oracle Cloud VM to serve swedocs. Ubuntu 22.04/24.04.
#
#   scp deploy/bootstrap.sh ubuntu@<ip>:
#   ssh ubuntu@<ip> 'sudo bash bootstrap.sh swedocs.example.com "<ci-public-key>"'
#
# Idempotent: safe to run again after changing the domain.
set -euo pipefail

DOMAIN="${1:?usage: bootstrap.sh <domain> <ci-ssh-public-key>}"
CI_KEY="${2:?usage: bootstrap.sh <domain> <ci-ssh-public-key>}"
ROOT=/srv/swedocs

echo "==> Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https \
  curl rsync iptables-persistent

echo "==> Caddy"
if ! command -v caddy >/dev/null; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi

# The one that catches everybody. Oracle's Ubuntu images ship an iptables
# ruleset that REJECTs everything except ssh, *in addition to* the security
# list in the VCN. Open the port in the console and the host still refuses the
# connection, with no log line anywhere that says why.
echo "==> Host firewall: 80, 443"
iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null \
  || iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null \
  || iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null \
  || iptables -I INPUT 1 -p udp --dport 443 -j ACCEPT   # HTTP/3
install -d /etc/iptables
netfilter-persistent save >/dev/null 2>&1 || iptables-save > /etc/iptables/rules.v4

echo "==> Deploy user and document root"
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
install -d -m 750 -o deploy -g deploy "$ROOT"
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
grep -qxF "$CI_KEY" /home/deploy/.ssh/authorized_keys || echo "$CI_KEY" >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# Caddy runs as its own user and only needs to read what CI writes.
usermod -a -G deploy caddy 2>/dev/null || true

echo "==> Placeholder page, so the first certificate can be issued"
[ -f "$ROOT/index.html" ] || {
  echo '<!doctype html><title>swedocs</title><p>Waiting for the first deploy.' > "$ROOT/index.html"
  chown deploy:deploy "$ROOT/index.html"
}

echo
echo "Done. Next:"
echo "  1. Put deploy/Caddyfile at /etc/caddy/Caddyfile with the domain set to $DOMAIN"
echo "  2. sudo systemctl reload caddy"
echo "  3. curl -I https://$DOMAIN"
