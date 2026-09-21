import{Oc as f}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var k="textureAlphaCheckerVertexShader",p=`
precision highp float;attribute vec2 uv;varying vec2 vUv;void main() {vUv=uv;gl_Position=vec4(mod(uv,1.0)*2.0-1.0,0.0,1.0);}
`;f.ShadersStore[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerVertexShader};

//# debugId=71ECDF5E21E8FEDE64756E2164756E21
//# sourceMappingURL=chunk-jynj05pg.js.map
