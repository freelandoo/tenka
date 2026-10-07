import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SERVICE_CONTENT } from './services';

/**
 * Verifica o que o build EMITE, não o que o React renderiza.
 *
 * Esta suíte nasce de um bug real: as páginas de norma regulamentadora
 * renderizavam o disclaimer corretamente no navegador, mas o HTML estático
 * servido a crawler e a motor de IA trazia só título, intro e bullets. A
 * página lida sem JavaScript afirmava carga horária e modalidade de treinamento
 * obrigatório e omitia que a TENKA não emite certificado de NR — a leitura
 * errada que o bloco existe justamente para impedir.
 *
 * Testar o componente não pegaria isso: o componente estava certo. Só olhando
 * o arquivo gerado dá para ver a diferença.
 */

const DIST = join(process.cwd(), 'dist');
const built = existsSync(DIST);

// `npm test` roda sem build no CI de desenvolvimento; a suíte se pula sozinha
// em vez de falhar por um motivo que não é o dela.
const maybe = built ? describe : describe.skip;

function readRoute(path: string): string {
  return readFileSync(join(DIST, path.slice(1), 'index.html'), 'utf8');
}

maybe('HTML estático das páginas de norma regulamentadora', () => {
  const nrPages = SERVICE_CONTENT.filter((content) => content.regulation);

  it('serve a exigência da norma e o disclaimer no mesmo HTML', () => {
    for (const page of nrPages) {
      const html = readRoute(page.path);
      const reg = page.regulation!;

      // A afirmação normativa está lá...
      expect(html, `${page.path}: escopo`).toContain(reg.scope.slice(0, 40));
      // ...e o limite do serviço também, no mesmo documento.
      expect(html, `${page.path}: disclaimer`).toContain('não emitimos certificado');
      expect(html, `${page.path}: responsabilidade`).toContain('responsabilidade da empresa');
      expect(html, `${page.path}: data da conferência`).toContain(reg.checkedAt);
    }
  });

  it('não deixa carga horária sem a modalidade ao lado', () => {
    for (const page of nrPages) {
      const html = readRoute(page.path);
      for (const item of page.regulation!.requirements) {
        expect(html, `${page.path}: ${item.label}`).toContain(item.label);
      }
    }
  });
});

maybe('llms-full.txt', () => {
  const content = () => readFileSync(join(DIST, 'llms-full.txt'), 'utf8');

  it('leva o disclaimer junto de cada norma', () => {
    const text = content();
    for (const page of SERVICE_CONTENT.filter((item) => item.regulation)) {
      expect(text, page.path).toContain(page.regulation!.code);
    }
    // Uma ocorrência por página de NR.
    const occurrences = text.split('não emitimos certificado').length - 1;
    expect(occurrences).toBe(
      SERVICE_CONTENT.filter((item) => item.regulation).length,
    );
  });

  it('não carrega resto do e-mail antigo', () => {
    expect(content()).not.toContain('contato@tenka.com.br');
  });
});

maybe('HTML estático em geral', () => {
  it('não carrega resto do e-mail antigo em nenhuma rota', () => {
    for (const page of SERVICE_CONTENT) {
      expect(readRoute(page.path), page.path).not.toContain('contato@tenka.com.br');
    }
  });
});
