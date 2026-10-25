import{Nc as f}from"./chunk-rx6sw5jz.js";import"./chunk-ktfc2tac.js";var k="textureAlphaCheckerVertexShader",p=`
precision highp float;attribute vec2 uv;varying vec2 vUv;void main() {vUv=uv;gl_Position=vec4(mod(uv,1.0)*2.0-1.0,0.0,1.0);}
`;f.ShadersStore[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerVertexShader};

//# debugId=1A11BF0E2849179164756E2164756E21
//# sourceMappingURL=chunk-e0zdzcpx.js.map
