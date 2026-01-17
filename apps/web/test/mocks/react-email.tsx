import React from "react";

// Mock all @react-email/components exports
export const Html = ({ children }: { children: React.ReactNode }) => <html>{children}</html>;
export const Head = () => <head />;
export const Body = ({ children }: { children: React.ReactNode }) => <body>{children}</body>;
export const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const Section = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const Text = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;
export const Heading = ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>;
export const Hr = () => <hr />;
export const Img = ({ src, alt }: { src?: string; alt?: string }) => <img src={src} alt={alt} />;
export const Link = ({ children, href }: { children: React.ReactNode; href?: string }) => <a href={href}>{children}</a>;
export const Preview = ({ children }: { children: React.ReactNode }) => <span>{children}</span>;
export const Row = ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>;
export const Column = ({ children }: { children: React.ReactNode }) => <td>{children}</td>;
