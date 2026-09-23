import{Lc as f}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var k="textureAlphaCheckerVertexShader",p=`
precision highp float;attribute vec2 uv;varying vec2 vUv;void main() {vUv=uv;gl_Position=vec4(mod(uv,1.0)*2.0-1.0,0.0,1.0);}
`;f.ShadersStore[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerVertexShader};

//# debugId=2A5358185516B8A364756E2164756E21
//# sourceMappingURL=chunk-7ybd92y5.js.map
