import PptxGenJS from "pptxgenjs";
import { PresentationData } from "../types";

export const exportToPPT = (data: PresentationData) => {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  
  pptx.defineSlideMaster({
    title: "MASTER_SLIDE",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: 0, y: 0, w: "100%", h: 0.5, fill: { color: "1E3A8A" } } },
      { text: { text: "Stock Fine Investment Report", options: { x: 0.5, y: 0.1, color: "FFFFFF", fontSize: 12 } } }
    ],
  });

  data.slides.forEach((slide) => {
    const pptSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
    
    // Common Title
    pptSlide.addText(slide.title, { x: 0.5, y: 0.8, w: "90%", fontSize: 24, color: "1E3A8A", bold: true });

    if (slide.type === "Title") {
        pptSlide.addText(slide.subtitle || "", { x: 1, y: 2.5, w: 8, fontSize: 32, align: "center" });
    }
    else if (slide.type === "ScenarioAnalysis") {
        pptSlide.addText("シナリオ別予測 (詳細はWeb版または添付参照)", { x: 1, y: 2, w: 8, fontSize: 14 });
        if(slide.bodyText) pptSlide.addText(slide.bodyText, { x: 1, y: 3, w: 8, fontSize: 12 });
        // Chart placeholder
        pptSlide.addShape(pptx.ShapeType.rect, { x: 2, y: 4, w: 6, h: 3, fill: "F3F4F6" });
        pptSlide.addText("Chart Area", { x: 2, y: 5.5, w: 6, align: "center" });
    }
    else if (slide.type === "FundamentalAnalysis") {
        if(slide.tableData) {
             const headers = ["指標", "銘柄", "値", "競合", "理由"];
             const rows = slide.tableData.map(r => [r.metric, r.label, r.value1, r.value2, r.explanation]);
             pptSlide.addTable([headers, ...rows], { x: 0.5, y: 2, w: 9, fontSize: 10, border: { pt: 1, color: "CCCCCC" } });
        }
    }
    else {
        // Generic fallback
        if (slide.bodyText) pptSlide.addText(slide.bodyText, { x: 0.5, y: 1.5, w: 9, fontSize: 14 });
        if (slide.bulletPoints) {
            pptSlide.addText(slide.bulletPoints.map(bp => ({ text: bp, options: { bullet: true } })), { x: 0.5, y: 2.5, w: 9, h: 4 });
        }
    }
    
    // Footer
    pptSlide.addText("CONFIDENTIAL", { x: 8, y: 5.3, fontSize: 9, color: "999999" });
  });

  pptx.writeFile({ fileName: `Proposal_${data.clientName}.pptx` });
};