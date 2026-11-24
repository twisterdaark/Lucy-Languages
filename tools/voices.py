# Makes voice/<id>.mp3 for every fixed line (Microsoft neural voices through edge-tts), skipping files that exist.
# usage: python tools/voices.py lines.json voice/
import asyncio, json, os, sys, edge_tts
lines, out = json.load(open(sys.argv[1])), sys.argv[2]
os.makedirs(out, exist_ok=True)
sem = asyncio.Semaphore(6)
async def one(x):
    f = os.path.join(out, x['id'] + '.mp3')
    if os.path.exists(f) and os.path.getsize(f) > 0: return 0
    async with sem:
        for _ in range(4):
            try:
                await edge_tts.Communicate(x['text'], x['v']).save(f); return 1
            except Exception as e:
                err = e; await asyncio.sleep(2)
        print('failed', x['id'], err); return 0
async def main():
    made = sum(await asyncio.gather(*[one(x) for x in lines]))
    ids = sorted(x['id'] for x in lines if os.path.exists(os.path.join(out, x['id'] + '.mp3')))
    json.dump(ids, open(os.path.join(out, 'index.json'), 'w'))
    print(f'{made} new voice files, {len(ids)} of {len(lines)} lines voiced')
asyncio.run(main())
