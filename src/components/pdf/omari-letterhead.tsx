import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
    Svg,
    Path,
} from '@react-pdf/renderer';

// --- Brand Colors ---
const BRAND_PRIMARY = '#7c3aed'; // Omari Violet
const TEXT_SLATE = '#334155'; // Dark slate for heavy text
const TEXT_MUTED = '#94a3b8'; // Muted gray for footer

// --- Stylesheet ---
const styles = StyleSheet.create({
    page: {
        backgroundColor: '#ffffff',
        position: 'relative',
        fontFamily: 'Helvetica', // Default safe font
        paddingTop: 140,
        paddingBottom: 80,
        paddingHorizontal: 40,
    },
    /* --- Header Styles --- */
    headerContainer: {
        height: 120,
        borderBottomWidth: 4,
        borderBottomColor: BRAND_PRIMARY,
        borderBottomStyle: 'solid',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
    },
    headerBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.15, // Reduced opacity for a subtler fabric pattern effect
        objectFit: 'cover',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 40,
        paddingTop: 50,
        paddingBottom: 25,
    },
    /* --- Logo Group --- */
    logoGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoSvg: {
        width: 32,
        height: 32,
    },
    logoTextGroup: {
        flexDirection: 'column',
        justifyContent: 'center',
    },
    logoTextPart1: {
        fontSize: 16,
        fontWeight: 'bold',
        color: TEXT_SLATE,
        marginBottom: -1, // Micro-adjustment for tight stacking
        letterSpacing: 2,
    },
    logoTextPart2: {
        fontSize: 16,
        fontWeight: 'bold',
        color: BRAND_PRIMARY,
        letterSpacing: 2,
    },
    /* --- Contact Info --- */
    contactDetails: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 4,
    },
    contactText: {
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: TEXT_SLATE,
    },
    contactHighlight: {
        color: BRAND_PRIMARY,
    },
    contactEmail: {
        fontSize: 8,
        fontWeight: 'bold',
        letterSpacing: 1,
        color: BRAND_PRIMARY,
        textTransform: 'lowercase',
    },
    /* --- Body Layout --- */
    documentBody: {
        flex: 1,
    },
    /* --- Footer Styles --- */
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 12,
    },
    footerTextLeft: {
        fontSize: 8,
        color: TEXT_MUTED,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    footerTextRight: {
        fontSize: 8,
        color: BRAND_PRIMARY,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});

export const OmariLetterhead = ({ children }: { children?: React.ReactNode }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* ================= HEADER ================= */}
                <View style={styles.headerContainer} fixed>
                    {/* Subtle African Native Fabric Background */}
                    <Image
                        src="public/namibian-pattern.png"
                        style={styles.headerBackground}
                    />

                    <View style={styles.headerOverlay}>
                        {/* Left: Logo and Brand Name */}
                        <View style={styles.logoGroup}>
                            <Svg viewBox="0 0 32 32" style={styles.logoSvg}>
                                {/* Strict Number Casting on strokeWidth to prevent crashes */}
                                <Path
                                    d="M16 28C22.6274 28 28 22.6274 28 16C28 9.37258 22.6274 4 16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28Z"
                                    stroke={BRAND_PRIMARY}
                                    strokeWidth={4}
                                    fill="none"
                                />
                                <Path
                                    d="M16 22C19.3137 22 22 19.3137 22 16C22 12.6863 19.3137 10 16 10C12.6863 10 10 12.6863 10 16C10 19.3137 12.6863 22 16 22Z"
                                    fill={BRAND_PRIMARY}
                                />
                            </Svg>

                            <View style={styles.logoTextGroup}>
                                <Text style={styles.logoTextPart1}>OMARI</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                                    <Text style={styles.logoTextPart2}>FINANCE</Text>
                                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: TEXT_SLATE, letterSpacing: 1 }}>(PTY) LTD</Text>
                                </View>
                                <Text style={{ fontSize: 7, color: TEXT_MUTED, marginTop: 2, letterSpacing: 0.5 }}>NAMFISA Registered Micro-Lender</Text>
                            </View>
                        </View>

                        {/* Right: Premium Typed Contact Details - Updated as per request */}
                        <View style={styles.contactDetails}>
                            <Text style={styles.contactText}>1129 Nangolo Mbumba Road</Text>
                            <Text style={styles.contactText}>Walvis Bay, Namibia</Text>
                            <Text style={[styles.contactText, styles.contactHighlight]}>+264 81 270 7070</Text>
                            <Text style={styles.contactEmail}>loans@omarifinance.com</Text>
                        </View>
                    </View>
                </View>

                {/* ================= BODY ================= */}
                <View style={styles.documentBody}>
                    {children}
                </View>

                {/* ================= FOOTER ================= */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerTextLeft}>
                        WINDHOEK - SWAKOPMUND - WALVIS BAY
                    </Text>
                    <Text style={styles.footerTextRight}>
                        www.omarifinance.com
                    </Text>
                </View>

            </Page>
        </Document>
    );
};

export default OmariLetterhead;
