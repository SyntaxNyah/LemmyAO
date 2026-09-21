import{Oc as b}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var k="lod3DPixelShader",q=`precision highp float;precision highp sampler3D;const float GammaEncodePowerApprox=1.0/2.2;varying vec2 vUV;uniform sampler3D textureSampler;uniform float lod;uniform float slice;uniform int gamma;void main(void)
{ivec3 textureCoordinates=ivec3(vUV*vec2(textureSize(textureSampler,0).xy),int(slice));gl_FragColor=texelFetch(textureSampler,textureCoordinates,int(lod));if (gamma==0) {gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(GammaEncodePowerApprox));}}
`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};export{w as lod3DPixelShader};

//# debugId=6BA4A378BBB9584164756E2164756E21
//# sourceMappingURL=chunk-43rk8e4d.js.map
