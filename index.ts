import { Worker } from 'worker_threads';
import { readFile, writeFile } from './utils/io';
import { normalizeSubs } from './utils/normalize';
import { splitIntoChunks } from './utils/splitIntoChunks';

async function main() {
    // get argument from command line
    const inputPath = process.argv[2]
    const outputPath = process.argv[3]
    const workersCount = parseInt(process.argv[4] || '2')
    if (!inputPath) {
        console.error('Please provide a file path')
        return
    }
    if (!outputPath) {
        console.error('Please provide an output file path')
        return
    }

    const data = await readFile(inputPath);
    const normalizedData = normalizeSubs(data);
    const chunks = splitIntoChunks(normalizedData, workersCount);
    const workers = chunks.map((chunk, index) => ({ worker: new Worker('./workers/translation-worker.ts'), chunk, index }));

    const promises = workers.map(worker => {
        return new Promise<string>((resolve, reject) => {
            worker.worker.postMessage({ subtitles: worker.chunk, tempFilePath: `${process.cwd()}/.tmp.subs/${outputPath.split('/').pop()}.tmp${worker.index}`, index: worker.index });
            worker.worker.on('message', (translation) => {
                console.log('[main thread] subtitles received')
                worker.worker.terminate();
                resolve(translation);
            });

            worker.worker.on('error', reject);
            worker.worker.on('exit', (code) => {
                if (code != 0)
                    reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });
    })

    Promise.all(promises)
        .then((data) => {
            writeFile(outputPath, data.join(''))
            console.log('All workers finished their tasks', data)
        })
        .catch(err => console.error('A worker encountered an error: ', err));
}

main()