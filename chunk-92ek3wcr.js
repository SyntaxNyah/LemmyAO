import{Nc as f}from"./chunk-rx6sw5jz.js";import"./chunk-ktfc2tac.js";var k="textureAlphaCheckerPixelShader",p=`
precision highp float;uniform sampler2D textureSampler;varying vec2 vUv;void main() {gl_FragColor=vec4(vec3(1.0)-vec3(texture2D(textureSampler,vUv).a),1.0);}
`;f.ShadersStore[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerPixelShader};

//# debugId=00E0A8202EFB161E64756E2164756E21
//# sourceMappingURL=chunk-92ek3wcr.js.map
