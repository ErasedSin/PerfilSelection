# PerfilSelection

Menu de links com visual de tela de seleção de jogo. Os links aparecem em um carrossel 3D de círculos: o do centro abre o link, e os outros se movem com setas, arraste ou clique.

**Demo:** https://erasedsin.github.io/PerfilSelection/ (ative o GitHub Pages, veja abaixo)

## Recursos

- Carrossel em arco com perspectiva 3D e animação de movimento
- Navegação por setas do teclado, botões ◀ ▶, arraste (mouse e toque) e clique nas bolhas laterais
- Links reais (`<a>`): abrem em nova aba, funcionam com Tab/Enter e com clique direito
- Layout responsivo para celular
- Respeita a preferência de movimento reduzido do sistema
- Todo o conteúdo vem de um único arquivo, `links.json`

## Tecnologias

HTML, CSS e JavaScript puro, sem bibliotecas nem etapa de build.

## Estrutura

```
index.html   página
style.css    visual e animações
script.js    carrossel e controles
links.json   lista de links (o único arquivo que você precisa editar)
assets/      imagens dos links e fundo opcional (bg.jpg)
```

## Como personalizar os links

Edite o `links.json`. Cada item aceita:

| Campo | Obrigatório | Descrição |
|---|---|---|
| `name` | sim | nome mostrado abaixo do carrossel |
| `url` | sim | endereço aberto ao clicar |
| `image` | não | caminho de uma imagem local, como `assets/github.png` |

Sem `image`, o site tenta usar o ícone do próprio site do link e, se não conseguir, mostra as iniciais do nome.

O primeiro item da lista é o que aparece no centro ao abrir a página.

Para trocar o fundo, coloque uma imagem em `assets/bg.jpg`.




