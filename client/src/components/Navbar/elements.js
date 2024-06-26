// this is all copied from a template, definitely change later

import { FaBars } from "react-icons/fa";
import { NavLink as Link } from "react-router-dom";
import styled from "styled-components";

export const Nav = styled.nav`
    position: absolute;
    top: 0px;
    left: 0px;
    background: #000000;
    width: 10%;
    height: fit-content;
    min-height: 100%;
    ${'' /* display: flex; */}
    ${'' /* justify-content: space-between; */}
    padding: 1rem;
    z-index: 12;
`;

export const NavLink = styled(Link)`
    color: #eeeee4;
    display: flex;
    font-family: var(--font-zen-kaku-gothic-antique);
    align-items: left;
    text-decoration: none;
    padding: 2%;
    height: 60px;
    cursor: pointer;
    &.active {
        color: #A43f3f;
    }
`;
 
export const Bars = styled(FaBars)`
    display: none;
    color: #C53165;
    @media screen and (max-width: 768px) {
        display: block;
        position: absolute;
        top: 0;
        right: 0;
        transform: translate(-100%, 75%);
        font-size: 1.8rem;
        cursor: pointer;
    }
`;
 
export const NavMenu = styled.div`
    display: initial;
    align-items: left;
    margin-right: -24px;
    /* Second Nav */
    /* margin-right: 24px; */
    /* Third Nav */
    /* width: 100vw;
white-space: nowrap; */
    @media screen and (max-width: 200px) {
        display: none;
    }
`;