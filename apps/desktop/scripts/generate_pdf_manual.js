const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function createManualPDF(outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 45, bottom: 45, left: 40, right: 40 },
      bufferPages: true,
      info: {
        Title: "Manual do Usuário — OnliCert Manager",
        Author: "Equipe OnliCert Manager",
        Subject: "Guia Completo com Telas do App, Campos e Instalação nos Computadores",
        Keywords: "OnliCert, SSL, TLS, CA, Manual, Windows, Linux, Firefox, Chrome, Proxmox, MikroTik",
      },
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Cores e Estilos
    const C = {
      primary: "#0f172a", // Slate 900
      secondary: "#1e293b", // Slate 800
      accent: "#2563eb", // Blue 600
      accentLight: "#3b82f6",
      accentBg: "#eff6ff", // Blue 50
      text: "#334155", // Slate 700
      textMuted: "#64748b", // Slate 500
      border: "#cbd5e1", // Slate 300
      cardBg: "#f8fafc", // Slate 50
      headerBg: "#0f172a",
      success: "#16a34a",
      successBg: "#f0fdf4",
      warning: "#d97706",
      warningBg: "#fffbe6",
      codeBg: "#1e293b",
      codeText: "#38bdf8",
      mockupBg: "#ffffff",
      mockupHeader: "#e2e8f0",
    };

    const checkNewPage = (neededHeight = 90) => {
      if (doc.y + neededHeight > 750) {
        doc.addPage();
      }
    };

    const addCover = () => {
      // Top Banner
      doc.rect(0, 0, 595.28, 230).fill(C.primary);

      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(28).text("OnliCert Manager", 45, 55);
      doc.fillColor("#93c5fd").font("Helvetica").fontSize(15).text("Manual Oficial: Telas do App, Campos e Instalação em Clientes", 45, 95);

      doc
        .fillColor("#cbd5e1")
        .font("Helvetica")
        .fontSize(10)
        .text(
          "Manual prático e ilustrado com capturas das telas reais do sistema, guia minucioso de preenchimento dos campos e passo a passo para configuração da CA Raiz nos computadores da rede (Windows, Linux, macOS, Chrome e Firefox).",
          45,
          130,
          { width: 505, lineGap: 3 }
        );

      doc.y = 250;

      // Highlights Box
      doc.roundedRect(45, doc.y, 505, 130, 8).fillAndStroke(C.cardBg, C.border);

      let inY = doc.y + 15;
      doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(12).text("CONTEÚDO DESTE MANUAL COMPLETO", 65, inY);

      const items = [
        "1. Ilustração e explicação detalhada de cada uma das 5 telas do aplicativo.",
        "2. Detalhamento campo a campo: O que preencher, como preencher e exemplos válidos.",
        "3. Guia de escolha de algoritmos criptográficos (RSA 2048/4096 vs ECC P-256/P-384).",
        "4. Instalação e confiança da CA Raiz no Windows, Linux, macOS, Chrome e Firefox.",
        "5. Conexão e automação de implantação em 1-clique (Proxmox VE e MikroTik RouterOS).",
      ];

      inY += 20;
      items.forEach((it) => {
        doc.fillColor(C.text).font("Helvetica").fontSize(9).text(`•  ${it}`, 65, inY, { width: 465 });
        inY += 18;
      });

      doc.y = 400;
    };

    const addSectionHeader = (chapterNum, title) => {
      checkNewPage(110);
      doc.moveDown(0.8);
      doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(9).text(`CAPÍTULO ${chapterNum}`, { characterSpacing: 1.2 });
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(15).text(title);
      doc.moveDown(0.2);
      doc.strokeColor(C.accent).lineWidth(2).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.8);
    };

    const addSubHeader = (title) => {
      checkNewPage(50);
      doc.moveDown(0.4);
      doc.fillColor(C.secondary).font("Helvetica-Bold").fontSize(11.5).text(title);
      doc.moveDown(0.3);
    };

    const addParagraph = (text) => {
      checkNewPage(40);
      doc.fillColor(C.text).font("Helvetica").fontSize(9).text(text, { align: "justify", lineGap: 3 });
      doc.moveDown(0.4);
    };

    const addBullet = (title, desc) => {
      checkNewPage(30);
      doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(9).text("• ", { continued: true });
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(9).text(`${title}: `, { continued: true });
      doc.fillColor(C.text).font("Helvetica").fontSize(9).text(desc, { lineGap: 2 });
      doc.moveDown(0.3);
    };

    const addCallout = (title, text, isWarning = false) => {
      checkNewPage(70);
      const startY = doc.y;
      const bg = isWarning ? C.warningBg : C.accentBg;
      const borderC = isWarning ? C.warning : C.accent;
      const textC = isWarning ? C.warning : C.accent;

      doc.roundedRect(45, startY, 505, 55, 6).fillAndStroke(bg, borderC);
      doc.fillColor(textC).font("Helvetica-Bold").fontSize(9.5).text(title, 60, startY + 10);
      doc.fillColor(C.text).font("Helvetica").fontSize(8.5).text(text, 60, startY + 25, { width: 475, lineGap: 2 });
      doc.y = startY + 65;
    };

    const addCodeBlock = (code) => {
      checkNewPage(45);
      const startY = doc.y;
      const lines = code.split("\n").length;
      const h = Math.max(28, lines * 13 + 12);

      doc.roundedRect(45, startY, 505, h, 6).fill(C.codeBg);
      doc.fillColor(C.codeText).font("Courier").fontSize(8.5).text(code, 60, startY + 7, { width: 475 });
      doc.y = startY + h + 8;
    };

    const drawWindowMockup = (title, contentDrawFn, height = 160) => {
      checkNewPage(height + 35);
      const startY = doc.y;

      // Window Frame
      doc.roundedRect(45, startY, 505, height, 8).fillAndStroke("#ffffff", C.border);

      // Header Bar
      doc.roundedRect(45, startY, 505, 24, 6).fill("#e2e8f0");
      doc.rect(45, startY + 18, 505, 6).fill("#e2e8f0");

      // Dots
      doc.circle(57, startY + 12, 3.5).fill("#ef4444");
      doc.circle(67, startY + 12, 3.5).fill("#eab308");
      doc.circle(77, startY + 12, 3.5).fill("#22c55e");

      // Window Title
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(8.5).text(`OnliCert Manager — ${title}`, 92, startY + 7);

      contentDrawFn(startY + 30);

      doc.y = startY + height + 12;
    };

    const drawFieldsTable = (fields) => {
      checkNewPage(120);
      const startY = doc.y;
      const colWidths = [115, 65, 135, 190];

      // Header
      doc.rect(45, startY, 505, 22).fill(C.primary);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
      doc.text("CAMPO DO APP", 52, startY + 7);
      doc.text("OBRIGATÓRIO?", 167, startY + 7);
      doc.text("O QUE DEVE CONTER", 232, startY + 7);
      doc.text("COMO PREENCHER (EXEMPLO REAL)", 367, startY + 7);

      let currentY = startY + 22;

      fields.forEach((f, idx) => {
        checkNewPage(35);
        const bg = idx % 2 === 0 ? "#ffffff" : C.cardBg;
        const rowH = f.desc.length > 60 || f.example.length > 50 ? 34 : 24;

        doc.rect(45, currentY, 505, rowH).fillAndStroke(bg, C.border);

        doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(8).text(f.name, 52, currentY + 6, { width: colWidths[0] - 10 });

        const reqText = f.required ? "Sim (*)" : "Opcional";
        const reqColor = f.required ? C.accent : C.textMuted;
        doc.fillColor(reqColor).font("Helvetica").fontSize(7.8).text(reqText, 167, currentY + 6);

        doc.fillColor(C.text).font("Helvetica").fontSize(7.8).text(f.desc, 232, currentY + 5, { width: colWidths[2] - 10, lineGap: 1 });

        doc.fillColor(C.secondary).font("Courier").fontSize(7.8).text(f.example, 367, currentY + 5, { width: colWidths[3] - 10, lineGap: 1 });

        currentY += rowH;
      });

      doc.y = currentY + 10;
    };

    // DOCUMENT GENERATION

    addCover();

    // CHAPTER 1
    addSectionHeader("1", "Ilustração Visual das Telas do Aplicativo");
    addParagraph(
      "Abaixo estão apresentadas as capturas de tela fieis à interface do OnliCert Manager v0.1.0, com explicação completa de cada janela e seus elementos."
    );

    // MOCKUP 1: DASHBOARD (Matching screenshot 1)
    drawWindowMockup("Dashboard (Painel Geral)", (topY) => {
      // Menu Sidebar Indicator
      doc.roundedRect(52, topY + 5, 80, 120, 4).fill("#f1f5f9");
      doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(7.5).text("• Dashboard", 58, topY + 12);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7.5).text("  CA Raiz", 58, topY + 28);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7.5).text("  Certificados", 58, topY + 44);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7.5).text("  Servidores", 58, topY + 60);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7.5).text("  Configurações", 58, topY + 76);

      // Main content
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(11).text("Dashboard", 145, topY + 5);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7.5).text("Visão geral do seu ambiente de certificados", 145, topY + 18);

      // 4 Stats Cards
      const cardW = 92;
      const stats = [
        { label: "TOTAL CERTIFICADOS", val: "1", col: C.accent },
        { label: "SERVIDORES", val: "0", col: C.textMuted },
        { label: "EXPIRANDO BREVE", val: "0", col: C.textMuted },
        { label: "STATUS DA CA", val: "Ativa", col: C.success },
      ];

      stats.forEach((st, i) => {
        const x = 145 + i * (cardW + 6);
        doc.roundedRect(x, topY + 30, cardW, 40, 4).fillAndStroke(C.cardBg, C.border);
        doc.fillColor(C.textMuted).font("Helvetica").fontSize(6.5).text(st.label, x + 5, topY + 35);
        doc.fillColor(st.col).font("Helvetica-Bold").fontSize(12).text(st.val, x + 5, topY + 48);
      });

      // 2 Panels
      doc.roundedRect(145, topY + 78, 190, 45, 4).fillAndStroke("#ffffff", C.border);
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(7.5).text("Eventos Recentes", 152, topY + 83);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7).text("Nenhum evento registrado", 195, topY + 98);

      doc.roundedRect(342, topY + 78, 190, 45, 4).fillAndStroke("#ffffff", C.border);
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(7.5).text("Certificados Expirando", 349, topY + 83);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7).text("Nenhum resultado encontrado", 390, topY + 98);
    }, 135);

    addParagraph(
      "A tela Dashboard reúne os indicadores-chave da sua infraestrutura local. Nela você acompanha instantaneamente se a CA Raiz está ativa (verde), quantos certificados foram gerados e se há algum certificado prestes a vencer."
    );

    // MOCKUP 2: CA PAGE (Matching screenshot 2)
    drawWindowMockup("Autoridade Certificadora (CA Local)", (topY) => {
      // Active CA Main Card
      doc.roundedRect(55, topY + 5, 340, 115, 6).fillAndStroke("#ffffff", C.border);

      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(10).text("Minha CA Raiz Local", 65, topY + 12);
      doc.roundedRect(335, topY + 10, 50, 14, 3).fill(C.successBg);
      doc.fillColor(C.success).font("Helvetica-Bold").fontSize(7).text("Ativa", 350, topY + 14);

      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7.5).text("RSA_4096 • Válido até 28/07/2038", 65, topY + 26);

      // Metadata Grid
      doc.fillColor(C.textMuted).font("Helvetica-Bold").fontSize(6.5).text("NOME COMUM (CN)", 65, topY + 40);
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(8).text("OnliCert Local Root CA", 65, topY + 48);

      doc.fillColor(C.textMuted).font("Helvetica-Bold").fontSize(6.5).text("ORGANIZAÇÃO (O)", 220, topY + 40);
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(8).text("Empresa Local", 220, topY + 48);

      doc.fillColor(C.textMuted).font("Helvetica-Bold").fontSize(6.5).text("ALGORITMO", 65, topY + 60);
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(8).text("RSA_4096", 65, topY + 68);

      doc.fillColor(C.textMuted).font("Helvetica-Bold").fontSize(6.5).text("ID DA CA", 220, topY + 60);
      doc.fillColor(C.textMuted).font("Courier").fontSize(7.5).text("ca-1785496701982-c25g6", 220, topY + 68);

      // PEM Box
      doc.roundedRect(65, topY + 80, 320, 32, 4).fillAndStroke(C.cardBg, C.border);
      doc.fillColor(C.textMuted).font("Courier").fontSize(6.5).text("-----BEGIN CERTIFICATE-----\nMIIEHTCCAwGgAwIBAgIUNgPZaVEMyt23h0/bE2h14wjJokwDQYJKoZIhvcNAQEL...", 70, topY + 84);

      // Right Action Sidebar
      doc.roundedRect(405, topY + 5, 130, 115, 6).fillAndStroke("#ffffff", C.border);
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(8.5).text("Ações da CA", 413, topY + 12);

      const btns = ["Exportar CA", "Backup da CA", "Restaurar Backup", "Trocar Senha"];
      btns.forEach((bText, idx) => {
        doc.roundedRect(413, topY + 26 + idx * 21, 114, 17, 3).fillAndStroke(C.cardBg, C.border);
        doc.fillColor(C.text).font("Helvetica").fontSize(7.5).text(bText, 425, topY + 31 + idx * 21);
      });
    }, 130);

    addParagraph(
      "A tela Autoridade Certificadora exibe os detalhes da CA Raiz ativa. Você pode visualizar o certificado PEM assinado, copiar a chave pública diretamente para a área de transferência pelo botão 'Copiar PEM' ou exportar o arquivo para os computadores clientes pelo botão 'Exportar CA'."
    );

    // MOCKUP 3: CERTIFICATES PAGE (Matching screenshot 3)
    drawWindowMockup("Certificados Digitais Emitidos", (topY) => {
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(11).text("Certificados", 55, topY + 5);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7.5).text("Emita e gerencie certificados digitais", 55, topY + 17);

      // Top right button
      doc.roundedRect(435, topY + 5, 100, 20, 4).fill(C.accent);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5).text("+ Emitir Certificado", 443, topY + 11);

      // Search bar
      doc.roundedRect(55, topY + 30, 150, 18, 4).fillAndStroke(C.cardBg, C.border);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7.5).text("🔍 Pesquisar...", 62, topY + 35);

      // Certificate Item Card (matching user screenshot 3: samba.onlitec.corp)
      doc.roundedRect(55, topY + 54, 480, 42, 4).fillAndStroke("#ffffff", C.border);

      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(9).text("Servidor Web App", 80, topY + 62);
      doc.roundedRect(165, topY + 60, 52, 12, 3).fill(C.successBg);
      doc.fillColor(C.success).font("Helvetica-Bold").fontSize(6.5).text("Ativo (365d)", 170, topY + 63);

      doc.roundedRect(223, topY + 60, 42, 12, 3).fill(C.cardBg);
      doc.fillColor(C.textMuted).font("Helvetica-Bold").fontSize(6.5).text("SERVER", 229, topY + 63);

      doc.fillColor(C.textMuted).font("Courier").fontSize(7.5).text("CN: samba.onlitec.corp  •  RSA_2048  •  Válido até 31/07/2027", 80, topY + 77);

      // Action icons
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(9).text("🚫  🗑️", 495, topY + 68);
    }, 110);

    addParagraph(
      "Na tela Certificados, você encontra a lista de todos os certificados digitais emitidos pela sua CA. Na captura acima, vemos o certificado do servidor 'samba.onlitec.corp', emitido com chave RSA 2048 e validade até 2027."
    );

    // MOCKUP 4 & 5: SERVERS AND ADD SERVER MODAL (Matching screenshots 4 & 5)
    drawWindowMockup("Adicionar Servidor (Proxmox VE & MikroTik)", (topY) => {
      // Modal Box overlay
      doc.roundedRect(120, topY + 5, 350, 145, 8).fillAndStroke("#ffffff", C.primary);

      // Modal Title
      doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(10).text("🖥️ Adicionar Servidor", 132, topY + 12);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7).text("Conecte um servidor de destino (Proxmox VE, MikroTik RouterOS)", 132, topY + 24);

      // Modal Form inputs (matching screenshot 5)
      const modalFields = [
        { label: "Nome do Servidor *", val: "Meu Proxmox VE", x: 132, y: topY + 36, w: 155 },
        { label: "Tipo de Servidor *", val: "Proxmox VE ▼", x: 297, y: topY + 36, w: 160 },
        { label: "Endereço IP ou Hostname *", val: "192.168.1.50", x: 132, y: topY + 65, w: 155 },
        { label: "Porta API *", val: "8006", x: 297, y: topY + 65, w: 160 },
        { label: "Nome do Nó (Node) *", val: "pve", x: 132, y: topY + 94, w: 155 },
        { label: "API Token ID *", val: "root@pam!onlicert", x: 297, y: topY + 94, w: 160 },
      ];

      modalFields.forEach((mf) => {
        doc.fillColor(C.textMuted).font("Helvetica-Bold").fontSize(6.5).text(mf.label, mf.x, mf.y);
        doc.roundedRect(mf.x, mf.y + 8, mf.w, 17, 3).fillAndStroke(C.cardBg, C.border);
        doc.fillColor(C.primary).font("Helvetica").fontSize(7.5).text(mf.val, mf.x + 5, mf.y + 13);
      });

      // Modal Footer buttons
      doc.roundedRect(132, topY + 125, 85, 18, 3).fillAndStroke(C.cardBg, C.border);
      doc.fillColor(C.text).font("Helvetica").fontSize(7).text("Testar Conexão", 143, topY + 130);

      doc.roundedRect(377, topY + 125, 80, 18, 3).fill(C.accent);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7).text("Adicionar Servidor", 384, topY + 130);
    }, 160);

    // CAPÍTULO 2
    addSectionHeader("2", "Manual Detalhado de Preenchimento dos Campos");
    addParagraph(
      "Esta seção é o guia de referência para o preenchimento de cada um dos campos do aplicativo. Siga rigorosamente as indicações abaixo para evitar erros de validação SSL/TLS."
    );

    addSubHeader("2.1. Campos da Janela: Autoridade Certificadora (Criar CA)");
    drawFieldsTable([
      {
        name: "Nome Amigável",
        required: true,
        desc: "Nome interno de identificação no aplicativo.",
        example: "Minha CA Raiz Local",
      },
      {
        name: "Common Name (CN)",
        required: true,
        desc: "Nome oficial do emissor no certificado raiz.",
        example: "OnliCert Local Root CA",
      },
      {
        name: "Algoritmo",
        required: true,
        desc: "Tipo e tamanho de chave da CA Raiz.",
        example: "RSA_4096 (Máxima Segurança)",
      },
      {
        name: "Validade (dias)",
        required: true,
        desc: "Duração da validade da CA em dias.",
        example: "3650 (Equivale a 10 anos)",
      },
      {
        name: "Organização (O)",
        required: false,
        desc: "Nome oficial da sua empresa ou instituição.",
        example: "Empresa Local",
      },
      {
        name: "Senha Mestra",
        required: true,
        desc: "Senha para proteger a Chave Privada com AES-256.",
        example: "SenhaSegura123! (Guardar!)",
      },
    ]);

    addSubHeader("2.2. Campos da Janela: Emitir Certificado SSL/TLS");
    drawFieldsTable([
      {
        name: "Nome Amigável",
        required: true,
        desc: "Nome descritivo do serviço ou servidor.",
        example: "Servidor Web App",
      },
      {
        name: "Tipo de Certificado",
        required: true,
        desc: "Finalidade (Server, Client, VPN, CodeSigning).",
        example: "server (Servidor Web/TLS)",
      },
      {
        name: "Common Name (CN)",
        required: true,
        desc: "Endereço FQDN principal ou IP do servidor.",
        example: "samba.onlitec.corp",
      },
      {
        name: "Nomes Alternativos (SAN)",
        required: false,
        desc: "Domínios e IPs adicionais que o cert protege.",
        example: "DNS:samba.onlitec.corp, IP:192.168.1.50",
      },
      {
        name: "Validade (dias)",
        required: true,
        desc: "Prazos máximos (Navegadores exigem <= 398 dias).",
        example: "365 (1 ano)",
      },
      {
        name: "Algoritmo",
        required: true,
        desc: "Chave assimétrica do certificado folha.",
        example: "RSA_2048 ou ECC_P256",
      },
    ]);

    addCallout(
      "EXEMPLO REAL DE CERTIFICADO EMITIDO NO APP",
      "No exemplo da tela do aplicativo, emitimos o certificado 'Servidor Web App' para o Common Name 'samba.onlitec.corp', com algoritmo RSA 2048 e validade de 365 dias. Este certificado pode ser instalado em qualquer servidor web ou Samba da sua rede!",
      false
    );

    addSubHeader("2.3. Campos do Modal: Adicionar Servidor (Proxmox VE)");
    drawFieldsTable([
      {
        name: "Nome do Servidor",
        required: true,
        desc: "Identificador do servidor no painel do app.",
        example: "Meu Proxmox VE",
      },
      {
        name: "Tipo de Servidor",
        required: true,
        desc: "Plugin de automação (Proxmox VE ou MikroTik).",
        example: "Proxmox VE",
      },
      {
        name: "Endereço IP / Hostname",
        required: true,
        desc: "IP de rede do painel do Proxmox.",
        example: "192.168.1.50",
      },
      {
        name: "Porta API",
        required: true,
        desc: "Porta HTTPS do serviço (Proxmox padrão 8006).",
        example: "8006",
      },
      {
        name: "Nome do Nó (Node)",
        required: true,
        desc: "Nome exato do Nó do Proxmox VE.",
        example: "pve",
      },
      {
        name: "API Token ID",
        required: true,
        desc: "Token criado no Proxmox para autenticação.",
        example: "root@pam!onlicert",
      },
      {
        name: "API Token Secret",
        required: true,
        desc: "Segredo do Token gerado no Proxmox.",
        example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      },
      {
        name: "Validar SSL da API",
        required: true,
        desc: "Se true, exige cert válido na conexão inicial.",
        example: "false (Recomendado na 1ª instalação)",
      },
    ]);

    // CAPÍTULO 3
    addSectionHeader("3", "Como Instalar a CA Raiz nos Computadores Clientes");
    addParagraph(
      "Para que o certificado emitido para 'samba.onlitec.corp' ou qualquer outro servidor seja aceito sem nenhum aviso de erro no Google Chrome, Microsoft Edge ou Firefox, o certificado da CA Raiz ('OnliCert Local Root CA') deve ser importado no repositório confiável dos computadores."
    );

    addParagraph("Passo Inicial: Na tela 'Autoridade Certificadora', clique em 'Exportar CA' ou 'Copiar PEM' e salve o arquivo ca.crt no computador do usuário.");

    addSubHeader("3.1. Instalação no Microsoft Windows (Windows 10 / 11)");
    addParagraph("Método 1: Assistente Gráfico do Windows");
    addParagraph("1. Dê dois cliques no arquivo ca.crt exportado.");
    addParagraph("2. Clique no botão 'Instalar Certificado...'.");
    addParagraph("3. Escolha 'Computador Local' e clique em 'Avançar'.");
    addParagraph("4. Marque 'Colocar todos os certificados no repositório a seguir' -> clique em 'Procurar...'.");
    addParagraph("5. Selecione a pasta 'Autoridades Certificadoras Raiz Confiáveis' e clique em 'OK'.");
    addParagraph("6. Clique em 'Concluir'. Pronto! O Windows agora confia em todos os certificados da sua CA.");

    addParagraph("Método 2: Instalação Automática por Linha de Comando (CMD / PowerShell como Admin)");
    addCodeBlock("certutil -addstore -f \"ROOT\" C:\\caminho\\para\\ca.crt");

    addSubHeader("3.2. Instalação no Linux (Ubuntu, Debian, Mint)");
    addCodeBlock("sudo cp ca.crt /usr/local/share/ca-certificates/onlicert-root-ca.crt\nsudo update-ca-certificates");

    addSubHeader("3.3. Instalação no macOS");
    addParagraph("1. Abra o arquivo ca.crt no aplicativo 'Acesso ao Chaveiro' (Keychain Access).");
    addParagraph("2. Mova o certificado para a aba 'Sistema' (System).");
    addParagraph("3. Clique duas vezes no certificado, expanda 'Confiar' (Trust) e mude para 'Sempre Confiar' (Always Trust).");

    addSubHeader("3.4. Configuração no Mozilla Firefox");
    addParagraph("1. Abra as Configurações do Firefox -> Privacidadade e Segurança.");
    addParagraph("2. Em Certificados, clique em 'Ver Certificados...'.");
    addParagraph("3. Na aba Autoridades, clique em 'Importar...' e selecione o ca.crt.");
    addParagraph("4. Marque 'Confiar nesta CA para identificar sites' e salve.");

    // CAPÍTULO 4
    addSectionHeader("4", "Perguntas Frequentes (FAQ)");
    addBullet("P: Como funciona a implantação automática no Proxmox VE?", "R: Ao cadastrar o servidor e clicar em 'Instalar Certificado', o OnliCert Manager conecta na API do Proxmox e atualiza os certificados do pveproxy sem derrubar as VMs.");
    addBullet("P: O OnliCert Manager envia dados para a internet?", "R: Não. O sistema é 100% Zero-Cloud e opera em redes isoladas (Air-Gapped) sem comunicação externa.");

    // FOOTER & PAGES
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      if (i > 0) {
        doc.fillColor(C.textMuted).font("Helvetica").fontSize(8).text("OnliCert Manager — Manual Oficial do Usuário", 40, 20);
        doc.strokeColor(C.border).lineWidth(0.5).moveTo(40, 30).lineTo(555, 30).stroke();
      }

      doc.strokeColor(C.border).lineWidth(0.5).moveTo(40, 792 - 28).lineTo(555, 792 - 28).stroke();
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(8).text("OnliCert Manager v0.1.0 — Documentação Oficial de Telas e Campos", 40, 792 - 20);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(8).text(`Página ${i + 1} de ${pageCount}`, 465, 792 - 20, { align: "right" });
    }

    doc.end();

    writeStream.on("finish", () => resolve(true));
    writeStream.on("error", (err) => reject(err));
  });
}

async function main() {
  const target1 = path.join(__dirname, "../public/manual_onlicert_manager.pdf");
  const target2 = path.join(__dirname, "../../../docs/manual_onlicert_manager.pdf");

  fs.mkdirSync(path.dirname(target1), { recursive: true });
  fs.mkdirSync(path.dirname(target2), { recursive: true });

  console.log("Gerando manual detalhado em PDF com telas fiéis aos prints...");
  await createManualPDF(target1);
  await createManualPDF(target2);
  console.log("PDF atualizado com sucesso em:");
  console.log(" -", target1);
  console.log(" -", target2);
}

main().catch(console.error);
