import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PDFViewer({
  pdfUrl,
  currentPage = 1
}) {

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "800px",
        overflow: "auto",
        display: "flex",
        justifyContent: "center",
        padding: "20px"
      }}
    >

      <Document
        file={pdfUrl}
        loading={<div>Loading PDF...</div>}
        onLoadSuccess={() => {
          console.log("PDF LOADED SUCCESSFULLY");
        }}
        onLoadError={(error) => {
          console.error("PDF LOAD ERROR:", error);
        }}
      >

        <Page
          pageNumber={currentPage}
          width={320}
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />

      </Document>

    </div>
  );
}