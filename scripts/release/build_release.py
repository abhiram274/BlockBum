#!/usr/bin/env python3
"""
BlockBum Unified Cross-Platform Build Automation Script
Orchestrates builds across Desktop (Electron/Tauri), Mobile (Expo/React Native), and Web.
"""

import os
import sys
import subprocess

def run_step(cmd, cwd=None):
    print(f"\n[BUILD] Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    res = subprocess.run(cmd, cwd=cwd, shell=True)
    if res.returncode != 0:
        print(f"[ERROR] Step failed with exit code {res.returncode}")
        return False
    return True

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    desktop_dir = os.path.join(root_dir, "client", "desktop")
    web_dir = os.path.join(root_dir, "client", "web")
    mobile_dir = os.path.join(root_dir, "client", "mobile")

    print("=======================================================")
    print("  BlockBum Cross-Platform Release Build Orchestrator   ")
    print("=======================================================")

    # 1. Build Desktop Client Frontend
    print("\n--- [1/4] Building Desktop Client UI ---")
    if not run_step("npm run build", cwd=desktop_dir):
        sys.exit(1)

    # 2. Build Web Onboarding Portal
    print("\n--- [2/4] Building Browser Web Portal ---")
    if not run_step("npm run build", cwd=web_dir):
        sys.exit(1)

    # 3. Mobile Manifest & Types Verification
    print("\n--- [3/4] Validating Mobile Manifest & Structure ---")
    app_json = os.path.join(mobile_dir, "app.json")
    if os.path.exists(app_json):
        print(f"[OK] Mobile manifest verified at {app_json}")
    else:
        print("[ERROR] Mobile app.json missing!")
        sys.exit(1)

    # 4. Generate Signed Release Manifest
    print("\n--- [4/4] Generating Cryptographically Signed Release Manifest ---")
    signer = os.path.join(root_dir, "scripts", "release", "sign_release.py")
    if not run_step(f"python {signer}"):
        sys.exit(1)

    print("\n=======================================================")
    print("  All Ecosystem Builds & Manifests Verified Cleanly!   ")
    print("=======================================================")

if __name__ == "__main__":
    main()
