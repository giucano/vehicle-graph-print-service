import express from "express";
import fs from "fs";
import path from "path";
import puppeteer from 'puppeteer';
import wkhtmltopdf from 'wkhtmltopdf';
import PDFDocument from 'pdfkit';
import SVGtoPDF from "svg-to-pdfkit";
import xml2js from 'xml2js';
import bodyParser from 'body-parser';

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const port = 3000;
const dirname = path.resolve(path.dirname(''));

async function printPDF(html, header, footer) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({
        format: 'A0',
        landscape: true,
        scale: 0.8,
        /*displayHeaderFooter: true,
        headerTemplate: '<span style="font-size: 16px; color: black; width: 100%;text-align: center">' + header + '</span>',
        footerTemplate: '<span style="font-size: 12px; color: black; width: 100%;text-align: center">' + footer + '</span>',
        margin: { top: 50, bottom: 50 }*/
    });

    await browser.close();
    return pdf
}

app.get('/puppeteer', function (req, res) {
    console.log('GET /puppeteer');
    var txt = fs.readFileSync(path.join(dirname, '/example3.txt'), 'utf8');
    var svg = Buffer.from(txt, 'base64');
    var html = fs.readFileSync(path.join(dirname, '/template.html'), 'utf8');
    html = html.replace('@svg', svg);

    var header = 'Scheduled Graph 21-01-2022 - SEZIONE FINALE LIGURE M.-GENOVA SESTRI';
    var footer = 'Printed on ' + new Date().toLocaleDateString();

    printPDF(html, header, footer).then(pdf => {
        res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length })
        res.send(pdf)
    })
});

app.get('/svg-to-pdfkit', function (req, res) {
    console.log('GET /svg-to-pdfkit');
    var base64 = fs.readFileSync(path.join(dirname, '/example3.txt'), 'utf8');

    var txt = Buffer.from(base64, 'base64');
    //var txt = fs.readFileSync(path.join(dirname, '/example2.svg'), 'utf8');
    var svg, defsObj;
    var defs = fs.readFileSync(path.join(dirname, '/defs.xml'), 'utf8');

    xml2js.parseString(defs, (err, result) => {
        defsObj = result;
    });

    xml2js.parseString(txt, (err, result) => {
        const builder = new xml2js.Builder();
        svg = builder.buildObject(result);
    });

    xml2js.parseString(txt, (err, result) => {
        result.svg.defs.push(defsObj.defs);
        const builder = new xml2js.Builder();
        svg = builder.buildObject(result);
    });

    const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A0'
    });

    SVGtoPDF(doc, svg, 0, 0, { preserveAspectRatio: 'none' });
    doc.pipe(res);
    doc.end();
});

app.get('/wkhtmltopdf', function (req, res) {
    console.log('GET /wkhtmltopdf');
    var txt = fs.readFileSync(path.join(dirname, '/example.txt'), 'utf8');
    var svg = Buffer.from(txt, 'base64');
    const svg2 = fs.readFileSync(path.join(dirname, '/example.svg')).toString();
    const svg3 = fs.readFileSync(path.join(dirname, '/simple.svg')).toString();
    var html = fs.readFileSync(path.join(dirname, '/template.html'), 'utf8');
    html = html.replace('@svg', svg2);

    wkhtmltopdf(svg3, {
        pageSize: 'A4',
        orientation: 'Landscape'
    }).pipe(res);

    res.writeHead(200, {
        'Content-Type': 'application/pdf'
    });
});

app.post('/puppeteer', express.raw({ type: 'application/pdf' }), async (req, res) => {
    console.log('POST /puppeteer');
    var svg = Buffer.from(req.body.svg, 'base64');
    var html = fs.readFileSync(path.join(dirname, '/template.html'), 'utf8');
    html = html.replace('@svg', svg);

    var header = 'Scheduled Graph 21-01-2022 - SEZIONE FINALE LIGURE M.-GENOVA SESTRI';
    var footer = 'Printed on ' + new Date().toLocaleDateString();

    printPDF(html, header, footer).then(pdf => {
        res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length })
        res.send(pdf)
    })
});

app.post('/svg-to-pdfkit', express.raw({ type: 'application/pdf' }), async (req, res) => {
    console.log('POST /svg-to-pdfkit');
    var txt = Buffer.from(req.body.svg, 'base64');
    //var txt = fs.readFileSync(path.join(dirname, '/example2.svg'), 'utf8');
    var svg, defsObj;
    var defs = fs.readFileSync(path.join(dirname, '/defs.xml'), 'utf8');

    xml2js.parseString(defs, (err, result) => {
        defsObj = result;
    });

    xml2js.parseString(txt, (err, result) => {
        const builder = new xml2js.Builder();
        svg = builder.buildObject(result);
    });

    xml2js.parseString(txt, (err, result) => {
        result.svg.defs.push(defsObj.defs);
        const builder = new xml2js.Builder();
        svg = builder.buildObject(result);
    });

    const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A0'
    });

    SVGtoPDF(doc, svg, 0, 0, { preserveAspectRatio: 'none' });
    doc.pipe(res);
    doc.end();
});

app.listen(port, () => {
    console.log(`PDF Printing Service listening on port ${port}`)
});