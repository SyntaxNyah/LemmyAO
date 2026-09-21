import{Oc as f}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var k="textureAlphaCheckerPixelShader",p=`
precision highp float;uniform sampler2D textureSampler;varying vec2 vUv;void main() {gl_FragColor=vec4(vec3(1.0)-vec3(texture2D(textureSampler,vUv).a),1.0);}
`;f.ShadersStore[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerPixelShader};

//# debugId=BB852D3229D39FF464756E2164756E21
//# sourceMappingURL=chunk-rsafmx7v.js.map
