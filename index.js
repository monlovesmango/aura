const http = require('http');
const fs = require('fs');
const path = require('path');

http.createServer((req, res) => {
    if (req.url === '/') {
        fs.readFile('./index.html', 'UTF-8', (err, html) => {
            res.writeHead(200, {'content-Type': 'text/html'});
            res.end(html);
        })
    } else if (req.url.match('\.css$')) {
        var cssPath = path.join(__dirname, req.url);
        var fileStream = fs.createReadStream(cssPath, 'UTF-8');
        res.writeHead(200, {'content-Type': 'text/css'});
        fileStream.pipe(res);
        
    } else if (req.url.match('\.js$')) {
        var cssPath = path.join(__dirname, req.url);
        var fileStream = fs.createReadStream(cssPath, 'UTF-8');
        res.writeHead(200, {'content-Type': 'application/javascript'});
        fileStream.pipe(res);
        
    } else {
        res.writeHead(404, {'content-Type': 'text/html'});
        res.end('no page found');

    }
}).listen(8000);
