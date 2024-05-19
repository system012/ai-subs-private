export function readFile(path: string) {
    return Bun.file(path).text()
}

export function fileExists(path: string): Promise<boolean> {
    return Bun.file(path).exists()
}

export function writeFile(path: string, content: string): void {
    try {
        Bun.write(path, content)
    } catch (error) {
        console.error(`Error writing file: ${error}`)
    }
}