import{f as z,g as A}from"./chunk-d12htaqn.js";import{V as v,Z as w}from"./chunk-6x2z9e4g.js";import"./chunk-zr9fqmm5.js";import"./chunk-tk9ja8wq.js";import"./chunk-w7g6ex7j.js";import"./chunk-g1z8560d.js";import"./chunk-mf99b6ep.js";import"./chunk-fez5n38c.js";import"./chunk-4f4cca1x.js";import"./chunk-mr1mg9nw.js";import"./chunk-pt38skrx.js";import"./chunk-wnpf0mxd.js";import"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";import"./chunk-bnedmxya.js";function $(k){return k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}class C extends w{isCompatible(k){switch(k){case v.GLSL:return!0;default:return!1}}getCustomCode(k){if(k==="vertex"){let t={};return t.CUSTOM_VERTEX_DEFINITIONS=z,t[`!${$("finalWorld=finalWorld*influence;")}`]=`
${A}
finalWorld=(finalWorld*influence);
`,t}if(k==="fragment"){let t={};t.CUSTOM_FRAGMENT_DEFINITIONS=`
#if defined(SPHERE_TEXTURE) && defined(NORMAL)
uniform sampler2D sphereSampler;
#endif
#ifdef TOON_TEXTURE
uniform sampler2D toonSampler;
#endif
`,t[`!${$(`#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION) || defined(PREPASS)
uniform mat4 view;
#endif`)}`]=`
#if defined(REFLECTIONMAP_SPHERICAL) || defined(REFLECTIONMAP_PROJECTION) || defined(REFRACTION) || defined(PREPASS)
uniform mat4 view;
#elif defined(NORMAL) && defined(SPHERE_TEXTURE)
uniform mat4 view;
#endif
`,t.CUSTOM_FRAGMENT_MAIN_BEGIN=`
#ifdef TOON_TEXTURE
vec3 toonNdl;
#endif
`,t[`!${$("vec3 diffuseColor=vDiffuseColor.rgb;")}`]=`
#ifdef APPLY_AMBIENT_COLOR_TO_DIFFUSE
vec3 diffuseColor=clamp(vDiffuseColor.rgb+vAmbientColor,0.0,1.0);
#else
vec3 diffuseColor=(vDiffuseColor.rgb);
#endif
`,t[`!${$("float alpha=vDiffuseColor.a;")}`]=`
#ifdef CLAMP_ALPHA
float alpha=clamp(vDiffuseColor.a,0.0,1.0);
#else
float alpha=vDiffuseColor.a;
#endif
`,t[`!${$("baseColor=texture2D(diffuseSampler,vDiffuseUV+uvOffset);")}`]=`
#if defined(DIFFUSE) && defined(TEXTURE_COLOR)
baseColor=texture2D(diffuseSampler,(vDiffuseUV+uvOffset));baseColor.rgb=mix(
vec3(1.0),
baseColor.rgb*textureMultiplicativeColor.rgb,
textureMultiplicativeColor.a
);baseColor.rgb=clamp(
baseColor.rgb+(baseColor.rgb-vec3(1.0))*textureAdditiveColor.a,
0.0,
1.0
)+textureAdditiveColor.rgb;
#else
baseColor=texture2D(diffuseSampler,(vDiffuseUV+uvOffset));
#endif
`,t[`!${$(`struct lightingInfo
{`)}`]=`
struct lightingInfo {
#ifdef TOON_TEXTURE
#ifndef NDOTL
float ndl;
#endif
float isToon;
#endif
`,t[`!${$("result.diffuse=ndl*diffuseColor*attenuation;")}`]=`
#ifdef TOON_TEXTURE
result.diffuse=diffuseColor*attenuation;result.ndl=ndl;result.isToon=1.0;
#elif defined(IGNORE_DIFFUSE_WHEN_TOON_TEXTURE_DISABLED) 
result.diffuse=diffuseColor*attenuation;
#else
result.diffuse=(ndl*diffuseColor*attenuation);
#endif
`,t[`!${$("diffuseBase+=info.diffuse*shadow;")}`]=`
#ifdef TOON_TEXTURE
toonNdl=vec3(clamp(info.ndl*shadow,0.02,0.98));toonNdl.r=texture2D(toonSampler,vec2(0.5,toonNdl.r)).r;toonNdl.g=texture2D(toonSampler,vec2(0.5,toonNdl.g)).g;toonNdl.b=texture2D(toonSampler,vec2(0.5,toonNdl.b)).b;
#ifdef TOON_TEXTURE_COLOR
toonNdl=mix(
vec3(1.0),
toonNdl*toonTextureMultiplicativeColor.rgb,
toonTextureMultiplicativeColor.a
);toonNdl=clamp(
toonNdl+(toonNdl-vec3(1.0))*toonTextureAdditiveColor.a,
0.0,
1.0
)+toonTextureAdditiveColor.rgb;
#endif
diffuseBase+=mix(info.diffuse*shadow,toonNdl*info.diffuse,info.isToon);
#elif defined(IGNORE_DIFFUSE_WHEN_TOON_TEXTURE_DISABLED)
diffuseBase+=info.diffuse;
#else
diffuseBase+=(info.diffuse*shadow);
#endif
`;let q=`
#ifdef EMISSIVEASILLUMINATION
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor+vAmbientColor,0.0,1.0)*baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
vec3 finalDiffuse=clamp((diffuseBase+emissiveColor)*diffuseColor+vAmbientColor,0.0,1.0)*baseColor.rgb;
#else
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor+emissiveColor+vAmbientColor,0.0,1.0)*baseColor.rgb;
#endif
#endif
`;return t[`!${$(q)}`]=`
#ifdef APPLY_AMBIENT_COLOR_TO_DIFFUSE
#ifdef EMISSIVEASILLUMINATION
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
vec3 finalDiffuse=clamp((diffuseBase+emissiveColor)*diffuseColor,0.0,1.0)*baseColor.rgb;
#else
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor+emissiveColor,0.0,1.0)*baseColor.rgb;
#endif
#endif
#else
${q.replace("diffuseBase","(diffuseBase)")}#endif
`,t.CUSTOM_FRAGMENT_BEFORE_FOG=`
#if defined(NORMAL) && defined(SPHERE_TEXTURE)
vec3 viewSpaceNormal=normalize(mat3(view)*vNormalW);vec2 sphereUV=viewSpaceNormal.xy*0.5+0.5;vec4 sphereReflectionColor=texture2D(sphereSampler,sphereUV);
#ifdef SPHERE_TEXTURE_COLOR
sphereReflectionColor.rgb=mix(
vec3(1.0),
sphereReflectionColor.rgb*sphereTextureMultiplicativeColor.rgb,
sphereTextureMultiplicativeColor.a
);sphereReflectionColor.rgb=clamp(
sphereReflectionColor.rgb+(sphereReflectionColor.rgb-vec3(1.0))*sphereTextureAdditiveColor.a,
0.0,
1.0
)+sphereTextureAdditiveColor.rgb;
#endif
sphereReflectionColor.rgb*=diffuseBase;
#ifdef SPHERE_TEXTURE_BLEND_MODE_MULTIPLY
color*=sphereReflectionColor;
#elif defined(SPHERE_TEXTURE_BLEND_MODE_ADD)
color=vec4(color.rgb+sphereReflectionColor.rgb,color.a);
#endif
#endif
`,t}return null}getUniforms(k){return{...super.getUniforms(k),fragment:`
#if defined(DIFFUSE) && defined(TEXTURE_COLOR)
uniform vec4 textureMultiplicativeColor;uniform vec4 textureAdditiveColor;
#endif
#if defined(SPHERE_TEXTURE) && defined(SPHERE_TEXTURE_COLOR)
uniform vec4 sphereTextureMultiplicativeColor;uniform vec4 sphereTextureAdditiveColor;
#endif
#if defined(TOON_TEXTURE) && defined(TOON_TEXTURE_COLOR)
uniform vec4 toonTextureMultiplicativeColor;uniform vec4 toonTextureAdditiveColor;
#endif
`}}}export{C as MmdPluginMaterial};

//# debugId=916981BA53B11E6564756E2164756E21
//# sourceMappingURL=chunk-7mt1wjqq.js.map
