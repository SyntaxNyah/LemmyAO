import{Lc as f}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var k="textureAlphaCheckerPixelShader",p=`
precision highp float;uniform sampler2D textureSampler;varying vec2 vUv;void main() {gl_FragColor=vec4(vec3(1.0)-vec3(texture2D(textureSampler,vUv).a),1.0);}
`;f.ShadersStore[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerPixelShader};

//# debugId=D5E6EDEAD19FEB6C64756E2164756E21
//# sourceMappingURL=chunk-4ctabxv1.js.map
