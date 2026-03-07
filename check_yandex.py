"""
Debug script - checks actual Yandex Disk public API response.
Pass the public folder URL as first argument.
Usage: python check_yandex.py "https://disk.yandex.ru/d/XXXXX"
"""
import httpx
import asyncio
import sys
import json

async def main():
    if len(sys.argv) < 2:
        print("Usage: python check_yandex.py <public_folder_url>")
        return

    public_key = sys.argv[1]
    print(f"Checking folder: {public_key}\n")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. List folder items
        resp = await client.get(
            "https://cloud-api.yandex.net/v1/disk/public/resources",
            params={"public_key": public_key, "limit": 100}
        )
        data = resp.json()
        print(f"Folder type: {data.get('type')}")
        items = data.get("_embedded", {}).get("items", [])
        print(f"Total items: {len(items)}\n")

        for item in items:
            name = item.get("name", "?")
            ftype = item.get("type", "?")
            file_url = item.get("file", "(no direct link)")
            path_field = item.get("path", "?")
            mime = item.get("mime_type", "?")
            print(f"  [{ftype}] {name}")
            print(f"    mime_type : {mime}")
            print(f"    path      : {path_field}")
            print(f"    file URL  : {file_url[:80] if len(file_url) > 80 else file_url}")

            # Try fetching download URL for txt files
            if name.lower().endswith(".txt"):
                print(f"  → Trying download URL for '{name}'...")
                dl_resp = await client.get(
                    "https://cloud-api.yandex.net/v1/disk/public/resources/download",
                    params={"public_key": public_key, "path": path_field}
                )
                print(f"    download status: {dl_resp.status_code}")
                if dl_resp.status_code == 200:
                    href = dl_resp.json().get("href", "")
                    print(f"    download href: {href[:80]}")
                    # Try downloading content
                    content_resp = await client.get(href)
                    print(f"    content status: {content_resp.status_code}, length: {len(content_resp.text)}")
                    if content_resp.status_code == 200:
                        print(f"    content preview: {content_resp.text[:100]}")
                else:
                    print(f"    error: {dl_resp.text}")
            print()

asyncio.run(main())
