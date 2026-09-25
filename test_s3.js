const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({
    region: "us-east-2",
    endpoint: "https://br-bitter-shape-b56g9al6.storage.c-7.us-east-2.aws.neon.tech",
    credentials: {
        accessKeyId: "nak_live_3afcc99de3b84446981130f25743604b",
        secretAccessKey: "nsk_live_fe589e09c6df51a2c2c7b597f6dd4f8f5f60027b60385c69392ae2e30c42c876"
    }
});

async function main() {
    try {
        const command = new ListBucketsCommand({});
        const response = await client.send(command);
        console.log(response.Buckets);
    } catch (err) {
        console.error(err);
    }
}
main();
